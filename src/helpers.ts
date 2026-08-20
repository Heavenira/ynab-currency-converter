/** Returns if a node is of type. `HTMLDivElement` */
export function isHTMLDiv(node: Node): node is HTMLDivElement {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as HTMLElement).tagName === "DIV"
  );
}

/** Returns if a node is of type. `HTMLDivElement` */
export function isHTMLSpan(node: Node): node is HTMLSpanElement {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as HTMLElement).tagName === "SPAN"
  );
}

/**
 * Simulates a user typing `text` into `input`, dispatching an `input` event per character.
 * @param clickAfter If true, clicks `input` 50ms after typing finishes, as if the user clicked it themselves.
 */
export function simulateTyping(
  input: HTMLInputElement,
  text: string,
  clickAfter: boolean,
) {
  const nativeValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;

  nativeValueSetter.call(input, "");

  for (const char of text) {
    nativeValueSetter.call(input, input.value + char);
    input.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: char,
        inputType: "insertText",
      }),
    );
  }

  if (clickAfter) {
    setTimeout(() => {
      input.focus();
      input.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
      input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      input.click();
      input.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      input.select();
      input.setSelectionRange(0, input.value.length);
    }, 50);
  }
}
