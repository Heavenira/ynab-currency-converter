import { getCurrencyRate } from "./convert-currency";
import { AccountInfo, Metadata } from "./ynab-conversion";

/** The DOM pointers that the button needs to modify the DOM. */
export interface RenderButtonPointers {
  cancelButton: HTMLButtonElement;
  memo: HTMLInputElement;
  date: HTMLInputElement;
  inflow: HTMLInputElement;
  outflow: HTMLInputElement;
}

/** Simulates a user typing `text` into `input`, dispatching an `input` event per character. */
function simulateTyping(input: HTMLInputElement, text: string) {
  const nativeValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;

  nativeValueSetter.call(input, "");

  for (const char of text) {
    nativeValueSetter.call(input, input.value + char);
    input.dispatchEvent(
      new InputEvent("input", { bubbles: true, data: char, inputType: "insertText" }),
    );
  }
}

export function renderButton(
  account: AccountInfo,
  rowId: string,
  pointers: RenderButtonPointers,
) {
  // There's no button to render if this is in the default currency.
  if (!account.currency) return;

  /** Button used to convert currency. */
  const button = document.createElement("button");
  button.classList.add(...pointers.cancelButton.classList);
  button.type = "button";
  button.textContent = `Convert from ${account.currency.readable}`;

  button.addEventListener("click", async () => {
    const metadata = new Metadata({
      date: pointers.date.value,
      inflow: pointers.inflow.value,
      outflow: pointers.outflow.value,
      memo: pointers.memo.value,
      rowId,
    });

    const currency = await getCurrencyRate(
      metadata.date,
      account.currency?.code,
    );

    if (metadata.inflow > 0) {
      metadata.rateInflow = currency;
    }
    if (metadata.outflow > 0) {
      metadata.rateOutflow = currency;
    }

    const stringified = metadata.stringify().trim();

    //await navigator.clipboard.writeText(currency.toString());
    await navigator.clipboard.writeText(stringified);
    button.textContent = "Copied!";

    
    simulateTyping(pointers.memo, stringified);
  });

  pointers.cancelButton.insertAdjacentElement("beforebegin", button);
}
