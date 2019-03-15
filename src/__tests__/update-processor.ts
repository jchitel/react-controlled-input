import UpdateProcessor from '../update-processor';


describe('UpdateProcessor', () => {
    let getCurrentValue: jest.Mock;
    let getPreviousValue: jest.Mock;
    let getCurrentSelection: jest.Mock;
    let getPreviousSelection: jest.Mock;
    let onTextChange: jest.Mock;

    let processor: UpdateProcessor;

    beforeEach(() => {
        getCurrentValue = jest.fn().mockReturnValue('value');
        getPreviousValue = jest.fn().mockReturnValue('value');
        getCurrentSelection = jest.fn().mockReturnValue({ start: 0, end: 0 });
        getPreviousSelection = jest.fn().mockReturnValue({ start: 0, end: 0 });
        onTextChange = jest.fn();

        processor = new UpdateProcessor(
            getCurrentValue,
            getPreviousValue,
            getCurrentSelection,
            getPreviousSelection,
            onTextChange
        );
    });

    describe('selection updates', () => {
        it('should detect when the selection has not changed', () => {
            processor.onUserUpdatedSelection();
    
            expect(onTextChange).not.toHaveBeenCalled();
        });
    
        it('should detect when the selection start has changed', () => {
            getCurrentSelection.mockReturnValue({ start: 1, end: 0 });
    
            processor.onUserUpdatedSelection();
    
            expect(onTextChange).toHaveBeenCalledTimes(1);
            expect(onTextChange).toHaveBeenCalledWith({
                timestamp: expect.any(Date),
                deletedText: null,
                insertedText: null,
                selectionStart: 1,
                selectionEnd: 0,
                paste: false,
                isFocused: false
            });
        });
    
        it('should detect when the selection end has changed', () => {
            getCurrentSelection.mockReturnValue({ start: 0, end: 1 });
    
            processor.onUserUpdatedSelection();
    
            expect(onTextChange).toHaveBeenCalledTimes(1);
            expect(onTextChange).toHaveBeenCalledWith({
                timestamp: expect.any(Date),
                deletedText: null,
                insertedText: null,
                selectionStart: 0,
                selectionEnd: 1,
                paste: false,
                isFocused: false
            });
        });
    });

    describe('value updates', () => {
        it('should detect when the value has not changed', () => {
            processor.onUserUpdatedValue();
    
            expect(onTextChange).not.toHaveBeenCalled();
        });

        it('should detect when the value changes', () => {
            getCurrentValue.mockReturnValue('value1');
            processor.computeTextChange = jest.fn().mockReturnValue({
                deletedText: null,
                insertedText: { start: 5, text: '1' }
            });
            
            processor.onUserUpdatedValue();

            expect(onTextChange).toHaveBeenCalledTimes(1);
            expect(onTextChange).toHaveBeenCalledWith({
                timestamp: expect.any(Date),
                deletedText: null,
                insertedText: { start: 5, text: '1' },
                selectionStart: 0,
                selectionEnd: 0,
                paste: false,
                isFocused: false
            });
        });
    });

    describe('text change computation', () => {
        const processValueChange = (
            previousValue: string,
            currentValue: string,
            previousSelectionStart: number,
            previousSelectionEnd: number,
            currentSelectionStart: number,
            currentSelectionEnd: number
        ) => {
            getPreviousValue.mockReturnValue(previousValue);
            getCurrentValue.mockReturnValue(currentValue);
            getPreviousSelection.mockReturnValue({ start: previousSelectionStart, end: previousSelectionEnd });
            getCurrentSelection.mockReturnValue({ start: currentSelectionStart, end: currentSelectionEnd });
            return processor.computeTextChange();
        }

        it('should compute backspace', () => {
            expect(processValueChange('value', 'vaue', 3, 3, 2, 2)).toEqual({
                deletedText: { start: 3, end: 2 },
                insertedText: null
            });
        });

        it('should compute delete', () => {
            expect(processValueChange('value', 'vaue', 2, 2, 2, 2)).toEqual({
                deletedText: { start: 2, end: 3 },
                insertedText: null
            });
        });

        it('should compute character insert', () => {
            expect(processValueChange('value', 'vallue', 3, 3, 4, 4)).toEqual({
                deletedText: null,
                insertedText: { start: 3, text: 'l' }
            });
        });

        it('should compute paste at selection', () => {
            expect(processValueChange('value', 'vallolue', 3, 3, 6, 6)).toEqual({
                deletedText: null,
                insertedText: { start: 3, text: 'lol' }
            });
        });

        it('should compute delete selection', () => {
            expect(processValueChange('value', 've', 1, 4, 1, 1)).toEqual({
                deletedText: { start: 1, end: 4 },
                insertedText: null
            });
        });

        it('should compute type over selection', () => {
            expect(processValueChange('value', 'vee', 1, 4, 2, 2)).toEqual({
                deletedText: { start: 1, end: 4 },
                insertedText: { start: 1, text: 'e' }
            });
        });

        it('should compute paste over selection', () => {
            expect(processValueChange('value', 'vlole', 1, 4, 4, 4)).toEqual({
                deletedText: { start: 1, end: 4 },
                insertedText: { start: 1, text: 'lol' }
            });
        });

        it('should compute external drop', () => {
            expect(processValueChange('value', 'vallolue', 0, 0, 3, 6)).toEqual({
                deletedText: null,
                insertedText: { start: 3, text: 'lol' }
            });
        });

        it('should compute internal drag and drop', () => {
            expect(processValueChange('value', 'vuale', 1, 3, 2, 4)).toEqual({
                deletedText: { start: 1, end: 3 },
                insertedText: { start: 2, text: 'al' }
            });
        });
    });
});
