# react-controlled-input

This component fills a need for a standard input that allows control of input properties beyond those provided by native DOM attributes: most notably, text selection.

React DOM allows you to fully control the `value` property of `<input />` elements. This means that if the property remains fixed, no user action will be able to change that value. Only changing the property will change the value of the input, and the `onChange` property allows parent components to respond to user input and correspondingly change the prop. React calls components used in this manner "**controlled components**", as opposed to "uncontrolled components", where the component manages its own internal state. HTML elements, including `<input />`, can behave as both controlled and uncontrolled components, depending which props the developer specifies.

With `react-controlled-input`, you can specify all standard `<input />` properties, and in addition, you can specify the following:

## `selectionStart`

Directly controls the `selectionStart` property of an `<input />` element's underlying `HTMLInputElement` instance, which corresponds to the start of the text selection range when the input is in focus. This has no effect when the element is not in focus.

Similarly to the behavior of the `value` property, setting the `selectionStart` property will disallow the user from directly changing the text selection range of the input. Instead, an `onSelectionChange` event will be fired with the resulting selection whenever the user triggers a change of the selection range.

**NOTE: Use of the `selectionStart` property requires
