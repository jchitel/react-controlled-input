import React from 'react';
import UpdateProcessor, { TextChangeEvent } from './update-processor';


export { TextChangeEvent, TextInsert, TextDelete } from './update-processor';

export interface ControlledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /**
     * The start of the highlighted text selection. If this is specified, `selectionEnd` is also required.
     * If this is equal to `selectionEnd`, that means the current selection is just a cursor (0-width selection).
     */
    selectionStart?: number;
    /**
     * The end (non-inclusive) of the highlighted text selection. If this is specified, `selectionStart` is also required.
     * If this is equal to `selectionStart`, that means the current selection is just a cursor (0-width selection).
     * This value can be less than `selectionStart`, indicating a backwards selection.
     */
    selectionEnd?: number;
    /**
     * Fires on any change of either:
     * - the text value
     * - the selection range
     * Except when those changes occurred from a propagation of a prop update.
     */
    onTextChange?: (event: TextChangeEvent) => void;
}

/**
 * An input providing fine control over the text value and selection range of an `<input />` element.
 * The selection range can be provided as props, and the internal selection range will always reflect those props.
 * User action which would change the text value or selection range will call the `onTextChange` prop with
 * information about the change, so that the controlling component can respond appropriately.
 */
export default class ControlledInput extends React.PureComponent<ControlledInputProps> {
    inputRef = React.createRef<HTMLInputElement>();

    // #region update processor callbacks

    getCurrentValue = () => this.inputRef.current ? this.inputRef.current.value : '';

    getPreviousValue = () => this.isValueControlled()
        ? this.props.value!.toString()
        : this.previousValue!;

    getCurrentSelection = () => this.inputRef.current
        ? { start: this.inputRef.current.selectionStart || 0, end: this.inputRef.current.selectionEnd || 0 }
        : { start: 0, end: 0 };

    getPreviousSelection = () => this.isSelectionControlled()
        ? { start: this.props.selectionStart!, end: this.props.selectionEnd! }
        : { start: this.previousSelectionStart!, end: this.previousSelectionEnd! };

    onTextChange = (event: TextChangeEvent) => {
        // set paste and focus values
        event.paste = this.paste;
        this.paste = false;
        event.isFocused = this.isFocused;
        // process tracked selection
        if (this.isSelectionControlled()) {
            // selection is controlled, reset to previous state and wait for parent to send change
            const { start, end } = this.getPreviousSelection();
            this.resetSelection(start, end);
        } else {
            // selection is not controlled, no need to reset, just update the tracking values
            const { start, end } = this.getCurrentSelection();
            this.previousSelectionStart = start;
            this.previousSelectionEnd = end;
        }
        // process tracked value
        if (!this.isValueControlled()) {
            // if the value is controlled, react takes care of that
            // if the value is not controlled, we need to track it here
            this.previousValue = this.getCurrentValue();
        }
        // propagate the event to the parent
        if (this.props.onTextChange) this.props.onTextChange(event);
    }

    // #endregion

    updateProcessor = new UpdateProcessor(
        this.getCurrentValue,
        this.getPreviousValue,
        this.getCurrentSelection,
        this.getPreviousSelection,
        this.onTextChange
    );

    /** Tracking value to use when this is an uncontrolled component */
    previousValue?: string;
    /** Tracking selectionStart to use when this is an uncontrolled component */
    previousSelectionStart?: number;
    /** Tracking selectionEnd to use when this is an uncontrolled component */
    previousSelectionEnd?: number;

    /** True if a `paste` event just occurred. This is reset by the `input` event. */
    paste = false;
    /** Reflects the current focus state of the element. */
    isFocused = false;
    /** True if the mouse was pressed down on the input and has not yet been released. */
    mouseDown = false;
    /** Tracks if there is a drag operation that started in this input */
    dragStarted = false;
    /** If an `input` event was processed, this is flipped to true so that a `select` event doesn't double-process. */
    processed = false;

    // #region react lifecycle

    componentDidMount() {
        if (!this.inputRef.current) return;
        const input = this.inputRef.current;
        this.setupInputProxy(input);
        // set tracking values
        if (!this.isValueControlled()) this.previousValue = input.value;
        if (!this.isSelectionControlled()) {
            this.previousSelectionStart = input.selectionStart || 0;
            this.previousSelectionEnd = input.selectionEnd || 0;
        }
    }

    setupInputProxy(input: HTMLInputElement) {
        const existingValueDescriptor = Object.getOwnPropertyDescriptor(input, 'value');
        Object.defineProperty(input, 'value', {
            ...existingValueDescriptor,
            set: function(value) {
                console.log(`setting value to ${value}`);
                existingValueDescriptor.set!.call(this, value);
            }
        });

        const existingDefaultValueDescriptor = Object.getOwnPropertyDescriptor(input, 'defaultValue');
        Object.defineProperty(input, 'defaultValue', {
            ...existingDefaultValueDescriptor,
            set: function(value) {
                console.log(`setting default value to ${value}`);
                this._defaultValue = value;
            },
            get: function() {
                return this._defaultValue;
            }
        });

        const existingSetSelectionRange = input.setSelectionRange;
        input.setSelectionRange = function(start, end, direction) {
            console.log(`setting selection to ${start}, ${end}, ${direction}`);
            existingSetSelectionRange.call(this, start, end, direction);
        };
    }

    componentDidUpdate(prevProps: ControlledInputProps) {
        // react handles value updates, but not selection updates, so we need to handle that
        if (prevProps.selectionStart !== this.props.selectionStart || prevProps.selectionEnd !== this.props.selectionEnd) {
            // make sure to disable any selection updates from this change
            this.processed = true;
            // default to 0, if that's the case then we are moving from controlled to uncontrolled, which is undefined behavior
            this.resetSelection(this.props.selectionStart || 0, this.props.selectionEnd || 0);
        }
    }

    // #endregion

    // #region base event handlers

    onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        this.isFocused = true;
        if (this.props.onFocus) this.props.onFocus(e);
    }
    onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        // reset everything, the user can't do anything with this input when it isn't in focus
        objectAssign<ControlledInput>(this, { isFocused: false, paste: false, mouseDown: false, dragStarted: false });
        if (this.props.onBlur) this.props.onBlur(e);
    }

    onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        // reset the key and mouse state, the user is doing a paste
        objectAssign<ControlledInput>(this, { paste: true, mouseDown: false });
        if (this.props.onPaste) this.props.onPaste(e);
    }

    onMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
        this.mouseDown = true;
        if (this.props.onMouseDown) this.props.onMouseDown(e);
    }
    onMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
        if (this.mouseDown) {
            // mousemove event can change selection without firing a select event
            this.updateProcessor.onUserUpdatedSelection();
        }
        if (this.props.onMouseMove) this.props.onMouseMove(e);
    }
    onMouseOut = (e: React.MouseEvent<HTMLInputElement>) => {
        if (this.mouseDown) {
            // the mouse has left the input, so we need listeners on the document
            this.setDocumentMouseListeners();
        }
        if (this.props.onMouseOut) this.props.onMouseOut(e);
    }
    onMouseOver = (e: React.MouseEvent<HTMLInputElement>) => {
        if (this.mouseDown) {
            // the mouse has re-entered the input, so we can remove the listeners
            this.removeDocumentMouseListeners();
        }
        if (this.props.onMouseOver) this.props.onMouseOver(e);
    }
    onMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
        if (this.mouseDown) {
            this.mouseDown = false;
        }
        if (this.props.onMouseUp) this.props.onMouseUp(e);
    }

    setDocumentMouseListeners() {
        document.addEventListener('mousemove', this.onDocumentMouseMove);
        document.addEventListener('mouseup', this.onDocumentMouseUp);
    }
    removeDocumentMouseListeners() {
        document.removeEventListener('mousemove', this.onDocumentMouseMove);
        document.removeEventListener('mouseup', this.onDocumentMouseUp);
    }
    onDocumentMouseMove = () => {
        // mousemove event can change selection without firing a select event
        this.updateProcessor.onUserUpdatedSelection();
    }
    onDocumentMouseUp = () => {
        this.mouseDown = false;
        this.removeDocumentMouseListeners();
    }

    onDragStart = (e: React.DragEvent<HTMLInputElement>) => {
        this.dragStarted = true;
        if (this.props.onDragStart) this.props.onDragStart(e);
    }
    onDragLeave = (e: React.DragEvent<HTMLInputElement>) => {
        this.dragStarted = false;
        if (this.props.onDragLeave) this.props.onDragLeave(e);
    }

    /**
     * This is required to avoid React's warning about only setting
     * an input's value without also setting onChange.
     */
    onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (this.props.onChange) this.props.onChange(e);
    }

    // #endregion

    // #region core event handlers

    /**
     * Occurs any time the text value changes. We use this to finalize processing
     * of event sequences that change the text value. The current properties of this
     * component reflect the operation that occurred and the corresponding action that
     * should be taken.
     */
    onInput = (e: React.SyntheticEvent<HTMLInputElement>) => {
        // handle drag and drop
        if (this.dragStarted) {
            // this is the first of two inputs of a drag and drop, we need to wait for the next one
            this.dragStarted = false;
        } else {
            // handle the change
            this.updateProcessor.onUserUpdatedValue();
        }
        // set processed to true so the select doesn't double-process
        this.processed = true;

        if (this.props.onInput) this.props.onInput(e);
    }

    /**
     * This seems to be a React event as opposed to a standard DOM event, but it fires (almost)
     * every time the selection changes, so we can use it to detect most changes to the selection
     * that do not change the value.
     */
    onSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
        if (this.processed) {
            // this is appearing as part of an input event, we don't need to do anything here
            this.processed = false;
        } else {
            this.updateProcessor.onUserUpdatedSelection();
        }
        if (this.props.onSelect) this.props.onSelect(e);
    }

    // #endregion

    // #region control utilities

    isSelectionControlled() {
        return typeof this.props.selectionStart !== 'undefined' && typeof this.props.selectionEnd !== 'undefined';
    }

    isValueControlled() {
        return typeof this.props.value !== 'undefined';
    }

    resetSelection(start: number, end: number) {
        // this shouldn't happen
        if (!this.inputRef.current) return;
        const direction = (end - start) >= 0 ? 'forward' : 'backward';
        this.inputRef.current.setSelectionRange(start, end, direction);
    }

    // #endregion

    render() {
        const { selectionStart, selectionEnd, onTextChange, ...props } = this.props;

        return <input
            /* Element Ref */
            ref={this.inputRef}

            /* Passed Props */
            {...props}

            /* Focus Events */
            onFocus={this.onFocus}
            onBlur={this.onBlur}

            /* Clipboard Events */
            onPaste={this.onPaste}

            /* Mouse Events */
            onMouseDown={this.onMouseDown}
            onMouseMove={this.onMouseMove}
            onMouseOut={this.onMouseOut}
            onMouseOver={this.onMouseOver}
            onMouseUp={this.onMouseUp}

            /* Drag Events */
            onDragStart={this.onDragStart}
            onDragLeave={this.onDragLeave}

            /* Form Events */
            onInput={this.onInput}
            onChange={this.onChange}
            onSelect={this.onSelect}
        />;
    }
}

function objectAssign<T>(obj: T, props: Partial<T>): T {
    for (const prop in props) {
        obj[prop] = props[prop] as T[typeof prop];
    }
    return obj;
}
