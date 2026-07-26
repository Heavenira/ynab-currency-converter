/** Returns if a node is of type. `HTMLDivElement` */
export function isHTMLDiv(node: Node): node is HTMLDivElement {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as HTMLElement).tagName === "DIV"
  );
}

/** Returns the percent error between two numbers. */
export function percentError(
  expectedValue: number,
  actualValue: number,
): number {
  if (expectedValue === 0) {
    throw new Error("percentError is undefined when expectedValue is 0");
  }

  return (
    (Math.abs(actualValue - expectedValue) / Math.abs(expectedValue)) * 100
  );
}

/** Simulates a user typing `text` into `input`, dispatching an `input` event per character. */
export function simulateTyping(input: HTMLInputElement, text: string) {
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
}
