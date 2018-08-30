import React from 'react';


export interface ControlledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /**
     * The start of the highlighted text selection. If this is specified, `selectionEnd` is also required.
     * If this is equal to `selectionEnd`, that means the current selection is just a cursor (0-width selection).
     */
    selectionStart?: number;
    /**
     * The end (non-inclusive) of the highlighted text selection. If this is specified, `selectionStart` is also required.
     * If this is equal to `selectionStart`, that means the current selection is just a cursor (0-width selection).
     * If this is less than `selectionStart`, this means the selection is "backwards", which is completely valid.
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
 * A "patch" object to define the insertion of some text at a position in the input.
 */
export interface TextInsert {
    /** The sequence of characters inserted */
    text: string;
    /** The start index in the current text at which to insert the new text */
    start: number;
}

/**
 * A "patch" object to define the deletion of a range of text from the input.
 */
export interface TextDelete {
    /** The start index of the range to remove from the current text */
    start: number;
    /**
     * The end index (non-inclusive) of the range to remove from the current text.
     * If this is less than the `start`, the range is "backwards", indicating that either:
     * - the selection being removed was backwards
     * - the user used the standard "backspace" key to remove the character before the cursor
     */
    end: number;
}

/**
 * Event data for any event that changes either the text value or selection range of an input.
 * This includes any relevant information for the native event to be reproduced or otherwise
 * responded to by the controlling component.
 */
export interface TextChangeEvent {
    /**
     * When there is new text introduced to the input, this property will be included.
     * If `deletedText` is also included, there was a "replacement", and the `deletedText`
     * should be applied *before* the `insertedText`.
     */
    insertedText: TextInsert | null;
    /**
     * When there is existing text deleted from the input, this property will be included.
     * If `insertedText` is also included, there was a "replacement", and the `insertedText`
     * should be applied *after* the `deletedText`.
     */
    deletedText: TextDelete | null;
    /**
     * The current start of the selected text range *after* the event occurred.
     */
    selectionStart: number;
    /**
     * The current end of the selected text range *after* the event occurred.
     */
    selectionEnd: number;
    /**
     * If this is true, this text change was caused by a paste event. This is included
     * because some additional formatting may be desired when the user pastes text
     * into the input.
     */
    paste: boolean;
    /**
     * If this is true, the element is still in focus after the event occurred.
     * If false, the element is blurred after the event occurred.
     */
    isFocused: boolean;
}

/**
 * An input providing fine control over the text value and selection range of an `<input />` element.
 * The selection range can be provided as props, and the internal selection range will always reflect those props.
 * User action which would change the text value or selection range will call the `onTextChange` prop with
 * information about the change, so that the controlling component can respond appropriately.
 */
export default class ControlledInput extends React.PureComponent<ControlledInputProps> {
    info = ({ type, currentTarget: { value, selectionStart, selectionEnd, selectionDirection }, bubbles, cancelable, defaultPrevented, eventPhase, isTrusted, nativeEvent, preventDefault, isDefaultPrevented, stopPropagation, isPropagationStopped, persist, target, timeStamp, ...event }: React.SyntheticEvent<HTMLInputElement>) =>
        type.includes('key')
            ? console.log(type, event)
            : console.log(type, 'value:', value, 'start:', selectionStart, 'end:', selectionEnd, 'dir:', selectionDirection);

    render() {
        return <input
            /* Clipboard Events */
            onCut={this.info}
            onPaste={this.info}

            /* Focus Events  */
            onFocus={this.info}
            onBlur={this.info}

            /* Form Events  */
            onChange={this.info}
            onInput={this.info}
            onReset={this.info}
            onSubmit={this.info}
            onInvalid={this.info}

            /* Keyboard Events  */
            onKeyDown={this.info}
            onKeyPress={this.info}
            onKeyUp={this.info}

            /* MouseEvents  */
            onClick={this.info}
            onContextMenu={this.info}
            onDoubleClick={this.info}
            onDrag={this.info}
            onDragEnd={this.info}
            onDragEnter={this.info}
            onDragExit={this.info}
            onDragLeave={this.info}
            onDragOver={this.info}
            onDragStart={this.info}
            onDrop={this.info}
            onMouseDown={this.info}
            onMouseMove={this.info}
            onMouseOut={this.info}
            onMouseOver={this.info}
            onMouseUp={this.info}

            /* Selection Events  */
            onSelect={this.info}
        />;
    }
}
