import React from 'react';
import ReactDOM from 'react-dom';
import ControlledInput, { TextChangeEvent } from '../src';


interface AppState {
    value?: string;
    wireUpValue: boolean;
    selectionStart?: number;
    selectionEnd?: number;
    wireUpSelection: boolean;
    log: TextChangeEvent[];
}

class App extends React.PureComponent<{}, AppState> {
    state: AppState = {
        wireUpValue: false,
        wireUpSelection: false,
        log: []
    };

    onEnableValue = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ value: e.currentTarget.checked ? '' : undefined });
    onEnableWireUpValue = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ wireUpValue: e.currentTarget.checked });
    onChangeValue = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ value: e.currentTarget.value });
    onEnableSelection = (e: React.ChangeEvent<HTMLInputElement>) => this.setState(
        e.currentTarget.checked
            ? { selectionStart: 0, selectionEnd: 0 }
            : { selectionStart: undefined, selectionEnd: undefined }
    );
    onEnableWireUpSelection = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ wireUpSelection: e.currentTarget.checked });
    onChangeSelectionStart = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ selectionStart: +e.currentTarget.value });
    onChangeSelectionEnd = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ selectionEnd: +e.currentTarget.value });

    onTextChange = (e: TextChangeEvent) => {
        let state = {} as AppState;
        if (typeof this.state.value !== 'undefined' && this.state.wireUpValue) {
            let value = this.state.value;
            if (e.deletedText) {
                const { start, end } = e.deletedText;
                const array = [...value];
                const [min, max] = start <= end ? [start, end] : [end, start];
                array.splice(min, max - min);
                value = array.join('');
            }
            if (e.insertedText) {
                const { start, text } = e.insertedText;
                const array = [...value];
                array.splice(start, 0, ...text);
                value = array.join('');
            }
            state.value = value;
        }
        if (typeof this.state.selectionStart !== 'undefined' && this.state.wireUpSelection) {
            state = { ...state, selectionStart: e.selectionStart, selectionEnd: e.selectionEnd };
        }
        state.log = [e, ...this.state.log];
        this.setState(state);
    }

    render() {
        const { value, wireUpValue, selectionStart, selectionEnd, wireUpSelection, log } = this.state;

        return (
            <div style={{ margin: 20, display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                <div style={{ flex: '0 0 100px' }}>
                    <ControlledInput
                        value={value}
                        selectionStart={selectionStart}
                        selectionEnd={selectionEnd}
                        onTextChange={this.onTextChange}
                    />
                </div>
                <div>
                    <h3>Settings</h3>
                    <h4>Value</h4>
                    <p>
                        Enable this to turn on control of the "value" prop of the input.
                        When this is off, it should be freely modifiable.
                        When it is on, it should only change when the value changes here.
                    </p>
                    <input type="checkbox" checked={typeof value !== 'undefined'} onChange={this.onEnableValue} />
                    <p>
                        Enable this to wire up "text change events" to this value, so that modifications
                        to the input will be reflected here.
                    </p>
                    <input type="checkbox" checked={wireUpValue} onChange={this.onEnableWireUpValue} />
                    <input type="text" disabled={typeof value === 'undefined'} value={value} onChange={this.onChangeValue} />
                    <h4>Selection</h4>
                    <p>
                        Enable this to turn on control of the "selectionStart" and "selectionEnd" props of the input.
                        When this is off, the selection should be freely modifiable.
                        When it is on, it should only change when the selection changes here.
                    </p>
                    <input type="checkbox" checked={typeof selectionStart !== 'undefined'} onChange={this.onEnableSelection} />
                    <p>
                        Enable this to wire up "text change events" to these props, so that modifications
                        to the input selection will be reflected here.
                    </p>
                    <input type="checkbox" checked={wireUpSelection} onChange={this.onEnableWireUpSelection} />
                    <input type="number" disabled={typeof selectionStart === 'undefined'} value={selectionStart} onChange={this.onChangeSelectionStart} />
                    <input type="number" disabled={typeof selectionEnd === 'undefined'} value={selectionEnd} onChange={this.onChangeSelectionEnd} />
                    <h3>Log</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Inserted Text</th>
                                <th>Deleted Text</th>
                                <th>Selection Start</th>
                                <th>Selection End</th>
                                <th>Paste</th>
                                <th>Is Focused</th>
                            </tr>
                        </thead>
                        <tbody>
                            {log.map((e, i) => <tr key={i}>
                                <th>{e.timestamp.toString()}</th>
                                <th>{e.insertedText ? `"${e.insertedText.text}" at ${e.insertedText.start}` : 'none'}</th>
                                <th>{e.deletedText ? `${e.deletedText.start} to ${e.deletedText.end}` : 'none'}</th>
                                <th>{e.selectionStart}</th>
                                <th>{e.selectionEnd}</th>
                                <th>{e.paste.toString()}</th>
                                <th>{e.isFocused.toString()}</th>
                            </tr>)}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
}

ReactDOM.render(<App />, document.getElementById('app'));
