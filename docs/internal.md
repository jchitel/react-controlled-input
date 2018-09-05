# Details

These are internal details that provide documentation of the implementation of the component for maintainers and contributors.

## Mechanism

This component abstracts all text input, deletion, and selection into a single event. Determining what text was inserted and deleted when the user does something is complicated for several reasons, but most notably because there are so many ways to do it, and detecting operations involves listening for several events, some of which may cross over one another in unexpected ways.

In order to handle these things in a foolproof way, we have decided to do two things:
* Attempt to identify and document the event sequences for all known types of user input (see [Events](#events) below)
* Use a flexible event queue system to listen for all relevant events and coalesce them together at the point that changes occur

Events are interesting because they are triggered by sequences. For example, a paste operation can be triggered by the user using the keyboard, triggering keyboard events, which triggers a paste event, which triggers input, change, and select events. We capture sequences to build knowledge of what the user is doing. So when we get keyboard events, we do what we can with them with the knowledge that we will have more information later. Once the paste event comes in, we know that the user pasted, and we can remove the previous keyboard events because we can determine what the text change was after the input event comes in. Then when that finally comes in, we can coalesce all that information into a single text change event, and reset the text selection.

But mouse and keyboard events can happen at the same time, so we need two separate queues to handle both independently. So that changes don't clobber each other, whatever sequence finishes first needs to be fully processed before the other one can be processed.

Another important thing that is handled by the queue is that sometimes DOM events can occur in unexpected and finnicky ways. But the good thing is that there are a lot of them. If you expect a select event to occur, but it doesn't, you can fall back on something like a key up or mouse up event to handle that for you. If all else fails, the first operation of the next event sequence to begin is to flush the queue. Ideally, things like this wouldn't be necessary. Perhaps with sufficiently extensive testing, we can identify edge cases that prove that DOM events *do* behave in a formulaic way.

## Events

In order to compute additions and removals on text fields, we need to know the type of event that triggered the change. This is a running list of events that can trigger changes to inputs that we care about for the purposes of this component. The events should be high-level user operations that can change the text value or selection range, not individual DOM events. ***This list is likely not complete, and should be updated when new event types are discovered, with a corresponding code change when applicable.***

### Generic Text Addition

Typing Unicode characters directly using the keyboard is the most common event type. This will always be triggered by keyboard events. Every keyboard operation has the following event sequence:

1. `keydown`: The key being pressed to trigger the input has been pressed, and is now down.
2. `keypress`: This is a generic event that can be used to capture presses of a key when you don't care when the key is down or up. It is triggered immediately after `keydown` because that is when the browser actually processes the key press and responds to it.
3. `input`: This is an event on focused text fields to indicate when the text value is modified. React's `onChange` event handler uses this internally.
4. `change`: *React only*: This is an event fired by React when an `input` even occurs that changes the text value. Normally a `change` event is only fired when the input is blurred. React overrides this behavior.
5. `select`: This is fired when an event occurs that will update the selection range, which occurs on most (*possibly all*) text changes.
6. `keyup`: The key that was pressed to trigger the input has been lifted, and is now up.

When holding down a character, the sequence from `keydown` to `select` is repeated.

These events will always produce an addition of one or more unicode code points. They can be distinguished from other keyboard events by comparing the `"key"` property of the `keydown` events. Not all key events trigger a `keypress`, so this should not be relied upon.

If there is a non-zero-length selection, any added text will also delete the selection before inserting the text.

**Sequences**:
* `keydown` listener fires, check what was clicked, if it was a letter, queue it as a "maybe text addition" event.
* `input` listener fires, "maybe text addition" event is in the queue, compare current values to old values, if they are different, fire a text change event
  * reset the selection

### Backspace/Delete

The backspace (`"key"` = `"Backspace"`, `"keyCode"/"which"` = `8`) and delete (`"key"` = `"Delete"`, `"keyCode"/"which"` = `46`) keys perform deletions of text in the input. They have the same event sequence as [Generic Text Additions](#generic-text-addition) above, with the exception that they do not fire `keypress` events.

The behavior changes depending on the length of the current selection:

* If the selection is length zero (a cursor), a backspace will remove one character immediately to the left of the cursor (decrementing the cursor), and a delete will remove one character immediately to the right of the cursor (not changing the cursor).
* If the selection is non-zero, both a backspace and a delete will remove the selection from the input, reducing the selection to a cursor in the selection's place.

**Sequences**:
* `keydown` listener fires, check what was clicked, if it was backspace/delete, queue it as a text deletion event.
* `input` listener fires, text deletion is in the queue, compare current values to old values, if they are different, fire a text change event
  * reset the selection

### Cut

A cut is a clipboard operation that acts as a copy followed by a delete. It copies any highlighted selection into the clipboard, and then deletes the selection from the input. There are a few ways to trigger a cut, primarily by right-clicking a selection and clicking "Cut", or using the keyboard shortcut "Ctrl+X". Luckily the DOM provides an abstracted event for cut operations with the following sequence (ignoring the mechanism of triggering the cut):

1. `cut`: The cut has been performed.
2. `input`: Same as [Generic Text Additions](#generic-text-addition).
3. `change`: Same as [Generic Text Additions](#generic-text-addition).
4. `select`: The selection changes because the highlighted selection has now been removed from the input.

Practically, cuts can be treated the same as deletes, but they are triggered via several mechanisms, so they need to be handled explicitly.

**Sequences**:
* `cut` listener fires, queue it
* `input` listener fires, compare current values to old values, if they are different, fire a text change event
  * reset the selection

### Paste

A paste is the reverse of a cut. It takes the contents of the clipboard and inserts it into the input, overwriting the current selection. Just like cuts, they can be triggered in a few ways, primarily by right-clicking a selection and clicking "Paste", or using the keyboard shortcut "Ctrl+V". Also like cuts, paste operations have an abstracted DOM event with the following sequence (ignoring the mechanism of triggering the paste):

1. `paste`: The paste has been performed.
2. `input`: Same as [Generic Text Additions](#generic-text-addition).
3. `change`: Same as [Generic Text Additions](#generic-text-addition).
4. `select`: The selection changes because new text has been inserted, replacing the selection.

Pastes present scenarios that are not possible with other input mechanisms because they are the only way to insert more than one character into an input in one operation. Because of this, it is often desired to handle pastes differently from other operations. For example, an auto-format input may want to format the inserted contents before adding them to the field. This is handled by setting a flag on a text change event indicating it was triggered as part of a paste. Aside from this, pastes can be handled effectively the same as a [Generic Text Addition](#generic-text-addition).

**Sequences**:
* `paste` listener fires, queue it
* `input` listener fires, compare current to old, fire text change event, reset selection

### Click Cursor Movement

The simplest way to set the cursor position is by clicking at the point to place the cursor. This will reset the selection to the nearest position to the mouse click. This is the event sequence:

1. `mousedown`: The mouse button is now down, wherever the mouse currently happens to be.
2. `mouseup`: The mouse button is now up, wherever the mouse currently happens to be.
3. `select`: The selection has now changed to the position selected by the mouse.
4. `click`: A click event is the mouse equivalent of a `keypress` event. It represents the full click operation, ignoring the actual `mousedown` and `mouseup` events.

These events can be handled simply because they only change the selection, not the text. A `click` event can be detected and the current selection can be used to generate the event.

**Sequences**:
* `mouseup` listener fires, queue it
* `select` listener fires, compare current to old, fire event, reset selection

### Click and Drag Selection

The simplest way to set a non-zero-length selection is by using a `mousedown` and `mouseup` event to set it. This is the event sequence:

1. `mousedown`: The mouse button is now down, wherever the mouse currently happens to be (note that the selection has not yet been changed).
2. `mousemove` (multiple): This event is fired every time the mouse moves in the input. In this case, it indicates that the user is dragging the mouse because it follows a `mousedown` event. These events now have the updated selection.
3. `mouseup`: The mouse button is now up, and the selection is finalized.
4. `select`: The selection has now been changed. Note, however, that the selection was still changing while the mouse was down, so this event is not sufficient in this case.
5. `click`: A click occurs every time a `mousedown` and `mouseup` pair occurs.

Because the selection changes without a corresponding `select` event until the end, these events need to be handled with `mousemove` listeners. But again, because the text value hasn't changed, they are simple to handle.

NOTE however, that this event only works properly while the mouse is contained within the input's box. The user is still able to move the mouse outside the input and continue changing the selection. In this case, the event sequence is:

1. `mousedown`
2. `mousemove` (multiple)
3. `mouseout`: The mouse has left the input's bounding box
4. `select`: Once the user releases the mouse button, the `select` event still fires, but the intermediate `mousemove` events are undetected.

To handle this scenario, it will likely be prudent to set a document-level `mousemove` and `mouseup` handler when the `mouseout` event is detected. Then when the `mouseup` is detected, the handler can be removed.

**Sequences**:
* `mousedown` listener fires, queue it
* `mousemove` listener fires, compare current to old, fire event, reset selection
* Two paths:
  * `mouseup` listener fires, we're all good
  * `mouseout` listener fires, attach document listeners, watch for `mousemove` and `mouseup` just like normal

### Keyboard Cursor Movement

The cursor and selection can also be controlled using the keyboard. The primary keys of interest here are:
* Left (`"key"` = `"ArrowLeft"`, `"keyCode"/"which"` = `37`): the left arrow key, which will decrement the cursor one at a time.
* Right (`"key"` = `"ArrowRight"`, `"keyCode"/"which"` = `39`): the right arrow key, which will increment the cursor one at a time.
* Up (`"key"` = `"ArrowUp"`, `"keyCode"/"which"` = `38`): the up arrow key, which will move instantly to the 0 position.
* Down (`"key"` = `"ArrowDown"`, `"keyCode"/"which"` = `40`): the down arrow key, which will move instantly to the end of the text length.
* Ctrl (`"key"` = `"Control"`, `"keyCode"/"which"` = `17`): this is the primary command key on Windows, and when used in combination with the arrow keys will move the cursor from word to word. On macOS, this performs OS-level operations and won't do anything in the browser unless specifically configured to do so.
* Shift (`"key"` = `"Shift"`, `"keyCode"/"which"` = `16`): this is an OS-independent key with several responsibilities, most notably changing the case of characters to uppercase while held down. When used in combination with the arrow keys (and other modifiers like Ctrl and Alt), this will fix the start of the selection range and only move the selection end, allowing the user to select a range of text using just the keyboard.
* Alt (`"key"` = `"Alt"`, `"keyCode"/"which"` = `18`): this is an alternate command key on most systems. On Windows, this does nothing for text selection. On macOS, this will do the same thing that Ctrl does on Windows, allowing the user to jump from word to word.
* Meta (`"key"` = `"Meta"`, `"keyCode"/"which"` = `91`): this is another command key that serves specific purposes on various systems. On Windows, this toggles the Start menu and allows control of window position, so it does not affect text selection. On macOS, when used in combination with arrow keys, this will shift the cursor to the start or end of the input.
* Home (`"key"` = `"Home"`, `"keyCode"/"which"` = `36`): this is an optional key on most systems that will shift the cursor to the start of the input (just like Up, and Meta+Left on macOS).
* End (`"key"` = `"End"`, `"keyCode"/"which"` = `35`): this is an optional key on most systems that will shift the cursor to the end of the input (just like Down, and Meta+Right on macOS).
* Ctrl+A (on Windows, Meta+A on macOS): this is a key combination that will select the full range of the input.

Like backspace and delete, these keys do not trigger `keypress` events, but they also do not fire `select` events. They can be detected by looking for `keydown` events with these `"key"` or `"keyCode"` values. However, because some of these operations are OS-dependent, it is usually better to look for just `select` events that do not follow a text insertion/deletion, because these keys will only change the selection, not the text value.

**Sequences**:
* `keydown` listener fires, check what was clicked, if it was not a letter or backspace/delete, queue it as a "maybe selection" event.
* `keyup` listener fires, "maybe selection" is in the queue, compare current values to old values, if they are different, fire a text change event
  * reset the selection

### Selection Drag and Drop

An operation supported in most browsers is to drag and drop a range of selected text. When a user creates a non-zero-length selection and then clicks and drags that selection, it initiates a "drag" operation. The selection being dragged can ultimately be "dropped" somewhere, which will copy it from the source location and apply it similarly to a paste in the target location.

In the case of inputs, text can be:
1. dragged out of the input to some external location (effectively a copy from the input),
2. dragged *from* some external location *to* the input (effectively a paste to the input), or
3. dragged from some location within the input to another location within the input (effectively a cut and paste operation).

Only scenarios 2 and 3 produce an event for this component, and both will produce just a single event. Scenario 1 does nothing because it is only a copy event, which does not change the text value or selection range of the input. However, it does need to be handled, because it shares events with the sequences of the other scenarios.

#### Drag

A drag involves removing a selection from the input, behaving like a copy operation. It has this sequence (starting after a selection has already been made):

1. `mousedown`
2. `mousemove` (multiple): The drag has not been detected yet.
3. `dragstart`: The drag operation has begun.
4. `drag`: The initial `drag` event on the drag element (the text, which belongs to the input), which appears several times during the operation.
5. `dragenter`: The event that starts the sequence that the drag element is within the input.
6. `dragover` and `drag` (repeat): `dragover` appears when an element is being dragged over an element, `drag` is an event on the element being dragged (which in this case is the input because the text is not an element on the page).
7. `dragleave`: The drag element has left the input.
8. `drag` (repeat): We still receive events on the drag element because it belongs to the text.
9. `dragend`: The drag operation is done (the element has been dropped).
10. `mouseout`: The mouseout event does not appear until the drag operation is done.

Note that the drag events "take over" control from the mouse events until the drag is done. Normally in a drag operation where one element is being dragged over another, the drag element (the element being dragged) issues `dragstart`, `drag`, and `dragend` events on itself, and the target only receives `dragenter`, `dragover`, and `dragleave` events. But because the element being dragged is text from an input, the input receives both sequences of events.

#### Drop

A drop involves inserting text from an external source into the input, behaving like a paste operation. This will ignore any selection in the target input. It has this sequence:

1. `dragenter`: The drag element has entered the input.
2. `dragover` (repeat): The drag element is being dragged over the input.
3. `drop`: The drag element has been dropped into the input. The selection has not been changed yet.
4. `input`: The text value has changed, so this is fired. The selection has now been updated.
5. `change`: *React only*: This fires every time `input` fires.

Note that there was no `select` event, even though the selection changed! This means this sequence will need to be handled specially.

Another important thing to note is that when text is dropped, the dropped text is automatically selected, which differs from a paste operation.

#### Drag and Drop

A drag and drop involves dragging a selection from an input to another place in the same input. This will cut and paste the selection, unlike a drag out of the input, which will just copy the selection. It has this sequence (starting after a selection has already been made):

1. `mousedown`
2. `mousemove` (multiple): The drag has not been detected yet.
3. `dragstart`: The drag operation has begun.
4. `drag`: The initial `drag` event on the drag element (the text, which belongs to the input), which appears several times during the operation.
5. `dragenter`: The event that starts the sequence that the drag element is within the input.
6. `dragover` and `drag` (repeat): `dragover` appears when an element is being dragged over an element, `drag` is an event on the element being dragged (which in this case is the input because the text is not an element on the page).
7. `drop`: The text has been dropped in the desired location. The value and selection have not changed yet.
8. `input`: The text is removed from its origin location. The value and selection are updated.
9. `change`: *React only*: corresponding change event.
10. `input`: The text is now inserted into its target location. The value and selection are updated.
11. `change`: *React only*: corresponding change event.
12. `dragend`: The drag operation is done.

Events 1-6 are the same as a drag. Eventually, there will be either a `dragleave` (drag operation) or a `drop` (drag and drop operation) event, which is where the paths diverge.

#### Conclusion

Looking at the common pieces between these workflows, there is a simple conclusion that can apply to these cases and all other combinations (e.g. drag, drag out, drag back in, drop): we only care about drops. The drag operation is inconsequential. The only things of interest happen when the drop occurs. We will likely need to track when a drag is being performed, which can be handled by `dragenter` and `dragleave` events. Other than that, all we care about is the `drop` and the `input`(s) that follows it.

**Sequences**:
* `dragenter` listener fires, flip flag on
* `dragleave` listener fires, flip flag off
* `drop` listener fires, queue it up
* `input` listener fires, if text was removed, queue it up, if it was added, handle any removals, then do the diff, fire, and reset the selection

### Full List of Events We Watch For

* Form Events:
    * `input`: text was inserted
    * `select`: the selection was modified
* Keyboard Events:
    * `keydown`: a key was pressed (for text insertion, text deletion, and selection change)
    * `keyup`: a key was released (for cases where `select` was not fired)
* Mouse Events:
    * `mousedown`: user is clicking or dragging
    * `mousemove`: user is moving the mouse (for mouse selection)
    * `mouseout`: mouse left the input (for mouse selection)
    * `mouseup`: user released the mouse (for mouse selection)
    * `dragenter`: drag element entered the input (for drag and drop)
    * `dragleave`: drag element left the input (for drag and drop)
    * `drop`: drag element was dropped (for drag and drop)
* Clipboard Events:
    * `cut`: user cut text (for text deletion)
    * `paste`: user pasted text (for paste, text insertion)
* Focus Events:
    * `focus`: user focused input (for parent components)
    * `blur`: user blurred input (for parent components)