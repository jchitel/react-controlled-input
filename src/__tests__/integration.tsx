import React from 'react';
import ReactDOM from 'react-dom';
import ControlledInput from '..';


describe('ControlledInput integration tests', () => {
    beforeEach(() => {
        // blow away the DOM and start fresh
        document.body.innerHTML = '<div id="mount"></div>';
    });

    // mounts a react element to the defined test mount point
    const render = async (element: React.ReactElement<any>) => new Promise<void>(resolve =>
        ReactDOM.render(element, document.getElementById('mount'), resolve)
    );

    // flushes the event queue by waiting 10 ms and then continuing
    const flushAsync = async () => new Promise<void>(resolve => setTimeout(resolve, 10));

    // dispatches an input event to an input with changes to the input and selection
    const dispatchInput = (input: HTMLInputElement, value: string, selectionStart: number, selectionEnd: number) => {
        input.focus();
        input.value = value;
        if (selectionStart === selectionEnd) {
            input.setSelectionRange(selectionStart, selectionEnd);
        } else {
            const start = Math.min(selectionStart, selectionEnd);
            const end = Math.max(selectionStart, selectionEnd);
            const direction = selectionStart < selectionEnd ? 'forward' : 'backward';
            input.setSelectionRange(start, end, direction);
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        // dispatch a selectionchange event so that the 'processed' flag resets
        input.dispatchEvent(new Event('selectionchange', { bubbles: true }));
    }

    // dispatches a select event to an input with changes to the selection
    const dispatchSelect = (input: HTMLInputElement, selectionStart: number, selectionEnd: number) => {
        input.focus();
        if (selectionStart === selectionEnd) {
            input.setSelectionRange(selectionStart, selectionEnd);
        } else {
            const start = Math.min(selectionStart, selectionEnd);
            const end = Math.max(selectionStart, selectionEnd);
            const direction = selectionStart < selectionEnd ? 'forward' : 'backward';
            input.setSelectionRange(start, end, direction);
        }
        input.dispatchEvent(new Event('selectionchange', { bubbles: true }));
    }

    describe('uncontrolled', () => {
        it('should update value when it changes', async () => {
            const onTextChange = jest.fn();
            await render(<ControlledInput onTextChange={onTextChange} />);

            const input = document.querySelector('input');
            dispatchInput(input, 'a', 1, 1);
            await flushAsync();

            expect(onTextChange).toHaveBeenCalledWith({
                timestamp: expect.any(Date),
                deletedText: null,
                insertedText: { start: 0, text: 'a' },
                selectionStart: 1,
                selectionEnd: 1,
                paste: false,
                isFocused: true
            });
            expect(onTextChange).toHaveBeenCalledTimes(1);
        });

        it('should update selection when it changes', async () => {
            const onTextChange = jest.fn();
            await render(<ControlledInput onTextChange={onTextChange} />);

            const input = document.querySelector('input');
            // dispatch initial input to pre-set the value so the selection can change
            dispatchInput(input, 'a', 1, 1);
            await flushAsync();
            onTextChange.mockClear();

            dispatchSelect(input, 0, 0);
            await flushAsync();

            expect(onTextChange).toHaveBeenCalledWith({
                timestamp: expect.any(Date),
                deletedText: null,
                insertedText: null,
                selectionStart: 0,
                selectionEnd: 0,
                paste: false,
                isFocused: true
            });
            expect(onTextChange).toHaveBeenCalledTimes(1);
        });
    });

    describe('controlled value', () => {
        it('should not change value when the prop is fixed', async () => {
            const onTextChange = jest.fn();
            await render(<ControlledInput onTextChange={onTextChange} value="value" />);

            const input = document.querySelector('input');
            dispatchInput(input, 'value1', 6, 6);
            //await flushAsync();

            expect(input.value).toBe('value');
        });

        it('should change value when the prop is updated', () => {/* TODO */});

        it('should change value when user input triggers prop update', () => {/* TODO */});

        it('should treat selection as uncontrolled', () => {/* TODO */});
    });

    describe('controlled selection', () => {
        it('should not change selection when the props are fixed', () => {/* TODO */});

        it('should change selection when props are updated', () => {/* TODO */});

        it('should change selection when user action triggers prop update', () => {/* TODO */});

        it('should treat value as uncontrolled', () => {/* TODO */});
    });

    describe('fully controlled', () => {
        describe('value updates', () => {
            it('should behave appropriately when a user types', () => {/* TODO */});

            it('should behave appropriately when a user pastes', () => {/* TODO */});

            it('should behave appropriately when a user backspaces', () => {/* TODO */});

            it('should behave appropriately when a user deletes', () => {/* TODO */});

            it('should behave appropriately when a user types over a selection', () => {/* TODO */});

            it('should behave appropriately when a user pastes over a selection', () => {/* TODO */});

            it('should behave appropriately when a user deletes a selection', () => {/* TODO */});

            it('should behave appropriately when a user drags external text into the input', () => {/* TODO */});

            it('should behave appropriately when a user drags and drops within the input', () => {/* TODO */});
        });

        describe('selection updates', () => {
            it('should behave appropriately when a user uses the arrow keys', () => {/* TODO */});

            it('should behave appropriately when a user uses the arrow keys with modifiers', () => {/* TODO */});

            it('should behave appropriately when a user uses home/end', () => {/* TODO */});

            it('should behave appropriately when a user uses Ctrl+A', () => {/* TODO */});

            it('should behave appropriately when a user uses the mouse to move the cursor', () => {/* TODO */});

            it('should behave appropriately when a user uses the mouse to create a selection', () => {/* TODO */});
        });

        describe('sequential updates', () => {/* TODO */})
    });
});
