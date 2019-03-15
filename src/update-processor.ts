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
     * The time that the event occurred. Note that this is isolated from the `timeStamp`
     * on the event(s) that triggered this event.
     */
    timestamp: Date;
    /**
     * When there is existing text deleted from the input, this property will be included.
     * If `insertedText` is also included, there was a "replacement", and the `insertedText`
     * should be applied *after* the `deletedText`.
     */
    deletedText: TextDelete | null;
    /**
     * When there is new text introduced to the input, this property will be included.
     * If `deletedText` is also included, there was a "replacement", and the `deletedText`
     * should be applied *before* the `insertedText`.
     */
    insertedText: TextInsert | null;
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
 * This class is responsible for abstracting the processing of changes.
 * It receives four types of events:
 * - user updated value
 * - user updated selection
 * 
 * It uses provided getters for retrieving the current and previous values,
 * and emits text change events when it detects actual changes in response
 * to the above events.
 * 
 * This serves two purposes:
 * - separating the DOM logic from the update processing logic
 * - separating the React control logic from the update processing logic
 */
export default class UpdateProcessor {
    constructor(
        readonly getCurrentValue: () => string,
        readonly getPreviousValue: () => string,
        readonly getCurrentSelection: () => { start: number, end: number },
        readonly getPreviousSelection: () => { start: number, end: number },
        readonly onTextChange: (event: TextChangeEvent) => void
    ) {}

    onUserUpdatedValue() {
        const valueChanged = this.getCurrentValue() !== this.getPreviousValue();
        const { start, end } = this.getCurrentSelection();

        if (valueChanged) {
            this.onTextChange({
                timestamp: new Date(),
                ...this.computeTextChange(),
                selectionStart: start,
                selectionEnd: end,
                paste: false,
                isFocused: false
            });
        }
    }

    onUserUpdatedSelection() {
        const { start: previousStart, end: previousEnd } = this.getPreviousSelection();
        const { start: currentStart, end: currentEnd } = this.getCurrentSelection();

        if (previousStart !== currentStart || previousEnd !== currentEnd) {
            this.onTextChange({
                timestamp: new Date(),
                deletedText: null,
                insertedText: null,
                selectionStart: currentStart,
                selectionEnd: currentEnd,
                paste: false,
                isFocused: false
            });
        }
    }

    /**
     * There is no reliable way to compute the actual change made to a text value without
     * tracking all possible events that can trigger a text change. Because there are many events
     * involved with various sequences that can vary across operating systems, we are using a
     * reliable heuristic that uses the current and previous selections as hints as to what the
     * change was, with the knowledge that actions the user performs are simple and do not include
     * additional changes to the selection.
     * 
     * These are the current known ways to change the text value:
     * - typing a character at the cursor
     * - doing a normal (backward) backspace at the cursor
     * - doing a forward backspace (delete) at the cursor
     * - pasting text at the cursor
     * - typing a character over a selection
     * - deleting a selection
     * - pasting over a selection
     * - dragging text from an external source into the input at some location
     * - dragging a selection from one location in the input to another location in the input
     * 
     * Thankfully, all of these cases have clear, strict rules for where the selections will be
     * before and after the change, so we can identify them fairly simply.
     * 
     * As a fallback, if there is some unknown input method that doesn't fit the specification
     * of these methods, the fallback is to do a full input replace. However, it is expected that
     * this should rarely happen. If it does, either the logic for known input methods is wrong,
     * there is another unknown input method that needs to be formalized, or some external non-react
     * code manually injected text into the input, in which case a full replace is actually accurate. 
     */
    computeTextChange(): Pick<TextChangeEvent, 'insertedText' | 'deletedText'> {
        // gather previous and current data
        const previousValue = this.getPreviousValue();
        const currentValue = this.getCurrentValue();
        const { start: previousStart, end: previousEnd } = this.getPreviousSelection();
        const { start: currentStart, end: currentEnd } = this.getCurrentSelection();
        // if the value didn't change, we have nothing to do here
        if (previousValue === currentValue) return { deletedText: null, insertedText: null };
        // compute the input mechanism
        const previousWasCursor = previousEnd === previousStart;
        const currentIsCursor = currentEnd === currentStart;
        if (currentIsCursor) {
            if (previousWasCursor) {
                if (currentStart === previousStart - 1 && splice(previousValue, previousStart - 1, 1) === currentValue) {
                    // backspace
                    return {
                        deletedText: { start: previousStart, end: previousStart - 1 },
                        insertedText: null
                    };
                } else if (currentStart === previousStart && splice(previousValue, previousStart, 1) === currentValue) {
                    // delete (forward backspace)
                    return {
                        deletedText: { start: previousStart, end: previousStart + 1 },
                        insertedText: null
                    };
                } else if (currentStart > previousStart && splice(currentValue, previousStart, currentStart - previousStart) === previousValue) {
                    // text insert (typing or pasting at the cursor)
                    return {
                        deletedText: null,
                        insertedText: { start: previousStart, text: currentValue.slice(previousStart, currentStart) }
                    };
                }
            } else /* !previousWasCursor */ {
                if (currentStart === previousStart && splice(previousValue, previousStart, previousEnd - previousStart) === currentValue) {
                    // delete selection, verify
                    return {
                        insertedText: null,
                        deletedText: { start: previousStart, end: previousEnd }
                    }
                } else if (currentStart > previousStart && splice(currentValue, previousStart, currentStart - previousStart) === splice(previousValue, previousStart, previousEnd - previousStart)) {
                    // type or paste over selection
                    return {
                        insertedText: { start: previousStart, text: currentValue.slice(previousStart, currentStart) },
                        deletedText: { start: previousStart, end: previousEnd }
                    }
                }
            }
        } else /* !currentIsCursor */ {
            if (previousWasCursor) {
                // drop from external source, verify
                if (splice(currentValue, currentStart, currentEnd - currentStart) === previousValue) {
                    return {
                        insertedText: { start: currentStart, text: currentValue.slice(currentStart, currentEnd) },
                        deletedText: null
                    }
                }
            } else /* !previousWasCursor */ {
                // drag and drop from within input, verify
                if (splice(previousValue, previousStart, previousEnd - previousStart) === splice(currentValue, currentStart, currentEnd - currentStart)) {
                    return {
                        insertedText: { start: currentStart, text: currentValue.slice(currentStart, currentEnd) },
                        deletedText: { start: previousStart, end: previousEnd }
                    }
                }
            }
        }
        // doesn't match any known input method, fall back to full replace
        return {
            insertedText: { start: 0, text: currentValue },
            deletedText: { start: 0, end: previousValue.length }
        };
    }
}

function splice(str: string, index: number, numToRemove: number): string {
    if (numToRemove < 0) {
        index = index - numToRemove;
        numToRemove = -numToRemove;
    }
    const array = [...str];
    array.splice(index, numToRemove);
    return array.join('');
}
