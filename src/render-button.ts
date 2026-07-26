import { getCurrencyRate } from "./convert-currency";
import { simulateTyping } from "./helpers";
import { AccountInfo, Metadata } from "./ynab-conversion";

/** The DOM pointers that the button needs to modify the DOM. */
export interface RenderButtonPointers {
  cancelButton: HTMLButtonElement;
  memo: HTMLInputElement;
  date: HTMLInputElement;
  inflow: HTMLInputElement;
  outflow: HTMLInputElement;
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

    if (metadata.inflow.ynab > 0) {
      metadata.inflow.bankValue = currency;
    }
    if (metadata.outflow.ynab > 0) {
      metadata.outflow.bankValue = currency;
    }

    const stringified = metadata.stringify().trim();

    //await navigator.clipboard.writeText(currency.toString());
    await navigator.clipboard.writeText(stringified);
    button.textContent = "Copied!";

    simulateTyping(pointers.memo, stringified);
  });

  pointers.cancelButton.insertAdjacentElement("beforebegin", button);
}
