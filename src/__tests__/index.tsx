import React from 'react';
import { mount, shallow } from 'enzyme';
import ControlledInput from '..';


describe('ControlledInput component', () => {
    describe('UpdateProcessor callbacks', () => {
        describe('getCurrentValue()', () => {
            it('should return current value', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput />);
                const inst = wrapper.instance();

                expect(inst.getCurrentValue()).toEqual('');

                inst.inputRef.current!.value = 'value';

                expect(inst.getCurrentValue()).toEqual('value');
            });
        });

        describe('getPreviousValue()', () => {
            it('should return previous value for an uncontrolled input', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput />);
                const inst = wrapper.instance();

                expect(inst.getPreviousValue()).toEqual('');

                inst.previousValue = 'value';

                expect(inst.getPreviousValue()).toEqual('value');
            });

            it('should return previous value for a controlled input', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput value="" />);
                const inst = wrapper.instance();

                expect(inst.getPreviousValue()).toEqual('');

                wrapper.setProps({ value: 'value' });

                expect(inst.getPreviousValue()).toEqual('value');
            });
        });

        describe('getCurrentSelection()', () => {
            it('should return current selection', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput value="abc" onChange={() => {}} />);
                const inst = wrapper.instance();

                expect(inst.getCurrentSelection()).toEqual({ start: 0, end: 0 });

                inst.inputRef.current!.setSelectionRange(1, 2);

                expect(inst.getCurrentSelection()).toEqual({ start: 1, end: 2 });
            });
        });

        describe('getPreviousSelection()', () => {
            it('should return previous selection for a uncontrolled input', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput />);
                const inst = wrapper.instance();

                expect(inst.getPreviousSelection()).toEqual({ start: 0, end: 0 });

                inst.previousSelectionStart = 1;
                inst.previousSelectionEnd = 2;

                expect(inst.getPreviousSelection()).toEqual({ start: 1, end: 2 });
            });

            it('should return previous selection for a controlled input', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput selectionStart={0} selectionEnd={0} />);
                const inst = wrapper.instance();

                expect(inst.getPreviousSelection()).toEqual({ start: 0, end: 0 });

                wrapper.setProps({ selectionStart: 1, selectionEnd: 2 });

                expect(inst.getPreviousSelection()).toEqual({ start: 1, end: 2 });
            });
        });

        describe('onTextChange()', () => {
            it('should set and reset "paste" and "isFocused"', () => {
                const onTextChange = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onTextChange={onTextChange} />);
                const inst = wrapper.instance();

                inst.paste = true;
                inst.isFocused = true;

                inst.onTextChange({
                    timestamp: new Date(),
                    deletedText: null,
                    insertedText: null,
                    selectionStart: 0,
                    selectionEnd: 0,
                    paste: false,
                    isFocused: false
                });
                
                expect(onTextChange).toHaveBeenCalledWith(expect.objectContaining({
                    paste: true,
                    isFocused: true
                }));
                expect(inst.paste).toBe(false);
                expect(inst.isFocused).toBe(true);
            });

            it('should process text changes for controlled selections', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput selectionStart={1} selectionEnd={2} />);
                const inst = wrapper.instance();
                inst.getPreviousSelection = jest.fn().mockReturnValue({ start: 1, end: 2 });
                inst.resetSelection = jest.fn();

                inst.onTextChange({
                    timestamp: new Date(),
                    deletedText: null,
                    insertedText: null,
                    selectionStart: 2,
                    selectionEnd: 3,
                    paste: false,
                    isFocused: false
                });

                expect(inst.getPreviousSelection).toHaveBeenCalled();
                expect(inst.resetSelection).toHaveBeenCalledWith(1, 2);
            });

            it('should process text changes for uncontrolled selections', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput />);
                const inst = wrapper.instance();
                inst.getCurrentSelection = jest.fn().mockReturnValue({ start: 1, end: 2 });

                inst.onTextChange({
                    timestamp: new Date(),
                    deletedText: null,
                    insertedText: null,
                    selectionStart: 0,
                    selectionEnd: 0,
                    paste: false,
                    isFocused: false
                });

                expect(inst.getCurrentSelection).toHaveBeenCalled();
                expect(inst.previousSelectionStart).toBe(1);
                expect(inst.previousSelectionEnd).toBe(2);
            });

            it('should process text changes for uncontrolled values', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput />);
                const inst = wrapper.instance();
                inst.getCurrentValue = jest.fn().mockReturnValue('value');

                inst.onTextChange({
                    timestamp: new Date(),
                    deletedText: null,
                    insertedText: null,
                    selectionStart: 0,
                    selectionEnd: 0,
                    paste: false,
                    isFocused: false
                });

                expect(inst.getCurrentValue).toHaveBeenCalled();
                expect(inst.previousValue).toBe('value');
            });
        });
    });

    describe('react lifecycle', () => {
        describe('componentDidMount()', () => {
            it('should handle component mount for fully uncontrolled input', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput />);
                const inst = wrapper.instance();

                expect(inst.previousValue).toBe('');
                expect(inst.previousSelectionStart).toBe(0);
                expect(inst.previousSelectionEnd).toBe(0);
            });

            it('should handle component mount for controlled value', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput value="value" onChange={() => {}} />);
                const inst = wrapper.instance();

                expect(inst.previousValue).toBeUndefined();
                expect(inst.previousSelectionStart).toBe(0);
                expect(inst.previousSelectionEnd).toBe(0);
            });

            it('should handle component mount for controlled selection', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput selectionStart={1} selectionEnd={2} />);
                const inst = wrapper.instance();

                expect(inst.previousValue).toBe('');
                expect(inst.previousSelectionStart).toBeUndefined();
                expect(inst.previousSelectionEnd).toBeUndefined();
            });
        });

        describe('componentDidUpdate()', () => {
            it('should handle update to selectionStart prop', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput selectionStart={1} selectionEnd={2} />);
                const inst = wrapper.instance();
                inst.resetSelection = jest.fn();

                wrapper.setProps({ selectionStart: 2 });
                expect(inst.processed).toBe(true);
                expect(inst.resetSelection).toHaveBeenCalledWith(2, 2);
            });

            it('should handle update to selectionStart prop', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput selectionStart={1} selectionEnd={2} />);
                const inst = wrapper.instance();
                inst.resetSelection = jest.fn();

                wrapper.setProps({ selectionEnd: 1 });
                expect(inst.processed).toBe(true);
                expect(inst.resetSelection).toHaveBeenCalledWith(1, 1);
            });
        });
    });

    describe('base event handlers', () => {
        describe('onFocus()', () => {
            it('should handle focus event', () => {
                const onFocus = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onFocus={onFocus} />);
                const inst = wrapper.instance();

                wrapper.find('input').simulate('focus');

                expect(inst.isFocused).toBe(true);
                expect(onFocus).toHaveBeenCalledWith(expect.any(Object));
            });
        });

        describe('onBlur()', () => {
            it('should handle blur event', () => {
                const onBlur = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onBlur={onBlur} />);
                const inst = wrapper.instance();

                inst.isFocused = true;
                inst.paste = true;
                inst.mouseDown = true;
                inst.dragStarted = true;
                wrapper.find('input').simulate('blur');

                expect(inst.isFocused).toBe(false);
                expect(inst.paste).toBe(false);
                expect(inst.mouseDown).toBe(false);
                expect(inst.dragStarted).toBe(false);
                expect(onBlur).toHaveBeenCalledWith(expect.any(Object));
            });
        });

        describe('onPaste()', () => {
            it('should handle paste event', () => {
                const onPaste = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onPaste={onPaste} />);
                const inst = wrapper.instance();

                inst.mouseDown = true;
                wrapper.find('input').simulate('paste');

                expect(inst.paste).toBe(true);
                expect(inst.mouseDown).toBe(false);
                expect(onPaste).toHaveBeenCalledWith(expect.any(Object));
            });
        });

        describe('onMouseDown()', () => {
            it('should handle mousedown event', () => {
                const onMouseDown = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onMouseDown={onMouseDown} />);
                const inst = wrapper.instance();

                wrapper.find('input').simulate('mousedown');

                expect(inst.mouseDown).toBe(true);
                expect(onMouseDown).toHaveBeenCalledWith(expect.any(Object));
            });
        });

        describe('onMouseMove()', () => {
            it('should handle mousemove event when the mouse is down', () => {
                const onMouseMove = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onMouseMove={onMouseMove} />);
                const inst = wrapper.instance();
                inst.updateProcessor.onUserUpdatedSelection = jest.fn();

                inst.mouseDown = true;
                wrapper.find('input').simulate('mousemove');

                expect(inst.updateProcessor.onUserUpdatedSelection).toHaveBeenCalled();
                expect(onMouseMove).toHaveBeenCalledWith(expect.any(Object));
            });

            it('should handle mousemove event when the mouse is up', () => {
                const onMouseMove = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onMouseMove={onMouseMove} />);
                const inst = wrapper.instance();
                inst.updateProcessor.onUserUpdatedSelection = jest.fn();

                wrapper.find('input').simulate('mousemove');

                expect(inst.updateProcessor.onUserUpdatedSelection).not.toHaveBeenCalled();
                expect(onMouseMove).toHaveBeenCalledWith(expect.any(Object));
            });
        });

        describe('onMouseOut()', () => {
            it('should handle mouseout event when the mouse is down', () => {
                const onMouseOut = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onMouseOut={onMouseOut} />);
                const inst = wrapper.instance();
                inst.setDocumentMouseListeners = jest.fn();

                inst.mouseDown = true;
                wrapper.find('input').simulate('mouseout');

                expect(inst.setDocumentMouseListeners).toHaveBeenCalled();
                expect(onMouseOut).toHaveBeenCalledWith(expect.any(Object));
            });

            it('should handle mouseout event when the mouse is up', () => {
                const onMouseOut = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onMouseOut={onMouseOut} />);
                const inst = wrapper.instance();
                inst.setDocumentMouseListeners = jest.fn();

                wrapper.find('input').simulate('mouseout');

                expect(inst.setDocumentMouseListeners).not.toHaveBeenCalled();
                expect(onMouseOut).toHaveBeenCalledWith(expect.any(Object));
            });
        });

        describe('onMouseOver()', () => {
            it('should handle mouseover event when the mouse is down', () => {
                const onMouseOver = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onMouseOver={onMouseOver} />);
                const inst = wrapper.instance();
                inst.removeDocumentMouseListeners = jest.fn();

                inst.mouseDown = true;
                wrapper.find('input').simulate('mouseover');

                expect(inst.removeDocumentMouseListeners).toHaveBeenCalled();
                expect(onMouseOver).toHaveBeenCalledWith(expect.any(Object));
            });

            it('should handle mouseover event when the mouse is up', () => {
                const onMouseOver = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onMouseOver={onMouseOver} />);
                const inst = wrapper.instance();
                inst.removeDocumentMouseListeners = jest.fn();

                wrapper.find('input').simulate('mouseover');

                expect(inst.removeDocumentMouseListeners).not.toHaveBeenCalled();
                expect(onMouseOver).toHaveBeenCalledWith(expect.any(Object));
            });
        });

        describe('onMouseUp()', () => {
            it('should handle mouseup event when the mouse is down', () => {
                const onMouseUp = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onMouseUp={onMouseUp} />);
                const inst = wrapper.instance();

                inst.mouseDown = true;
                wrapper.find('input').simulate('mouseup');

                expect(inst.mouseDown).toBe(false);
                expect(onMouseUp).toHaveBeenCalledWith(expect.any(Object));
            });

            it('should handle mouseup event when the mouse is up', () => {
                const onMouseUp = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onMouseUp={onMouseUp} />);
                const inst = wrapper.instance();

                wrapper.find('input').simulate('mouseup');

                expect(inst.mouseDown).toBe(false);
                expect(onMouseUp).toHaveBeenCalledWith(expect.any(Object));
            });
        });

        describe('document mouse listener toggles', () => {
            beforeEach(() => {
                document.addEventListener = jest.fn();
                document.removeEventListener = jest.fn();
            });

            afterEach(() => {
                delete document.addEventListener;
                delete document.removeEventListener;
            })

            it('should set document mouse listeners', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput />);
                const inst = wrapper.instance();

                inst.setDocumentMouseListeners();

                expect(document.addEventListener).toHaveBeenCalledWith('mousemove', inst.onDocumentMouseMove);
                expect(document.addEventListener).toHaveBeenCalledWith('mouseup', inst.onDocumentMouseUp);
            });

            it('should remove document mouse listeners', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput />);
                const inst = wrapper.instance();

                inst.removeDocumentMouseListeners();

                expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', inst.onDocumentMouseMove);
                expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', inst.onDocumentMouseUp);
            });
        });

        describe('onDocumentMouseMove()', () => {
            it('should handle document mousemove event', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput />);
                const inst = wrapper.instance();
                inst.updateProcessor.onUserUpdatedSelection = jest.fn();

                inst.onDocumentMouseMove();

                expect(inst.updateProcessor.onUserUpdatedSelection).toHaveBeenCalled();
            });
        });

        describe('onDocumentMouseUp()', () => {
            it('should handle document mouseup event', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput />);
                const inst = wrapper.instance();
                inst.removeDocumentMouseListeners = jest.fn();

                inst.mouseDown = true;
                inst.onDocumentMouseUp();

                expect(inst.mouseDown).toBe(false);
                expect(inst.removeDocumentMouseListeners).toHaveBeenCalled();
            });
        });

        describe('onDragStart()', () => {
            it('should handle dragstart event', () => {
                const onDragStart = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onDragStart={onDragStart} />);
                const inst = wrapper.instance();

                wrapper.find('input').simulate('dragstart');

                expect(inst.dragStarted).toBe(true);
                expect(onDragStart).toHaveBeenCalledWith(expect.any(Object));
            });
        });

        describe('onDragLeave()', () => {
            it('should handle dragleave event', () => {
                const onDragLeave = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onDragLeave={onDragLeave} />);
                const inst = wrapper.instance();

                inst.dragStarted = true;
                wrapper.find('input').simulate('dragleave');

                expect(inst.dragStarted).toBe(false);
                expect(onDragLeave).toHaveBeenCalledWith(expect.any(Object));
            });
        });
    });

    describe('core event handlers', () => {
        describe('onInput()', () => {
            it('should handle an input event after a dragstart event', () => {
                const onInput = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onInput={onInput} />);
                const inst = wrapper.instance();
                inst.updateProcessor.onUserUpdatedValue = jest.fn();

                inst.dragStarted = true;
                wrapper.find('input').simulate('input');

                expect(inst.dragStarted).toBe(false);
                expect(inst.processed).toBe(true);
                expect(inst.updateProcessor.onUserUpdatedValue).not.toHaveBeenCalled();
                expect(onInput).toHaveBeenCalledWith(expect.any(Object));
            });

            it('should handle an input event in the normal case', () => {
                const onInput = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onInput={onInput} />);
                const inst = wrapper.instance();
                inst.updateProcessor.onUserUpdatedValue = jest.fn();

                wrapper.find('input').simulate('input');

                expect(inst.processed).toBe(true);
                expect(inst.updateProcessor.onUserUpdatedValue).toHaveBeenCalled();
                expect(onInput).toHaveBeenCalledWith(expect.any(Object));
            });
        });

        describe('onSelect()', () => {
            it('should handle a select event after an input event', () => {
                const onSelect = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onSelect={onSelect} />);
                const inst = wrapper.instance();
                inst.updateProcessor.onUserUpdatedSelection = jest.fn();

                inst.processed = true;
                wrapper.find('input').simulate('select');

                expect(inst.processed).toBe(false);
                expect(inst.updateProcessor.onUserUpdatedSelection).not.toHaveBeenCalled();
                expect(onSelect).toHaveBeenCalledWith(expect.any(Object));
            });

            it('should handle a select event in the normal case', () => {
                const onSelect = jest.fn();
                const wrapper = mount<ControlledInput>(<ControlledInput onSelect={onSelect} />);
                const inst = wrapper.instance();
                inst.updateProcessor.onUserUpdatedSelection = jest.fn();

                wrapper.find('input').simulate('select');

                expect(inst.updateProcessor.onUserUpdatedSelection).toHaveBeenCalled();
                expect(onSelect).toHaveBeenCalledWith(expect.any(Object));
            });
        });
    });

    describe('control utilities', () => {
        describe('isSelectionControlled()', () => {
            it('should determine if the selection is controlled', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput />);
                const inst = wrapper.instance();

                expect(inst.isSelectionControlled()).toBe(false);

                wrapper.setProps({ selectionStart: 1 });

                expect(inst.isSelectionControlled()).toBe(false);

                wrapper.setProps({ selectionEnd: 2 });

                expect(inst.isSelectionControlled()).toBe(true);
            });
        });

        describe('isValueControlled()', () => {
            it('should determine if the value is controlled', () => {
                let wrapper = mount<ControlledInput>(<ControlledInput />);
                let inst = wrapper.instance();

                expect(inst.isValueControlled()).toBe(false);

                wrapper = mount<ControlledInput>(<ControlledInput value="value" onChange={() => {}} />);
                inst = wrapper.instance();

                expect(inst.isValueControlled()).toBe(true);
            });
        });

        describe('resetSelection()', () => {
            it('should reset the selection', () => {
                const wrapper = mount<ControlledInput>(<ControlledInput />);
                const inst = wrapper.instance();
                inst.inputRef.current!.setSelectionRange = jest.fn();

                inst.resetSelection(1, 2);

                expect(inst.inputRef.current!.setSelectionRange).toHaveBeenCalledWith(1, 2, 'forward');

                inst.resetSelection(2, 1);

                expect(inst.inputRef.current!.setSelectionRange).toHaveBeenCalledWith(2, 1, 'backward');
            });
        });
    });

    describe('render', () => {
        it('should render input', () => {
            const wrapper = shallow<ControlledInput>(<ControlledInput />);
            const inst = wrapper.instance();
            const input = wrapper.find('input');

            expect(input.props()).toEqual({
                onFocus: inst.onFocus,
                onBlur: inst.onBlur,
                onPaste: inst.onPaste,
                onMouseDown: inst.onMouseDown,
                onMouseMove: inst.onMouseMove,
                onMouseOut: inst.onMouseOut,
                onMouseOver: inst.onMouseOver,
                onMouseUp: inst.onMouseUp,
                onDragStart: inst.onDragStart,
                onDragLeave: inst.onDragLeave,
                onInput: inst.onInput,
                onChange: inst.onChange,
                onSelect: inst.onSelect,
            });
        });

        it('should forward props', () => {
            const onChange = jest.fn();
            const onBlur = jest.fn();
            const onTextChange = jest.fn();
            const wrapper = shallow<ControlledInput>(<ControlledInput
                selectionStart={1}
                selectionEnd={2}
                onTextChange={onTextChange}
                value="value"
                onChange={onChange}
                onBlur={onBlur}
            />);
            const inst = wrapper.instance();
            const input = wrapper.find('input');

            expect(input.props()).toEqual({
                value: 'value',
                onFocus: inst.onFocus,
                onBlur: inst.onBlur,
                onPaste: inst.onPaste,
                onMouseDown: inst.onMouseDown,
                onMouseMove: inst.onMouseMove,
                onMouseOut: inst.onMouseOut,
                onMouseOver: inst.onMouseOver,
                onMouseUp: inst.onMouseUp,
                onDragStart: inst.onDragStart,
                onDragLeave: inst.onDragLeave,
                onInput: inst.onInput,
                onChange: inst.onChange,
                onSelect: inst.onSelect,
            });
        });
    });
});
