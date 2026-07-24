import { getCurrencyRate } from "./convert-currency";
import { AccountInfo, Metadata, parseDate } from "./ynab-conversion";

export function createButton(account: AccountInfo, metadata: Metadata, cancelButtonPointer: HTMLButtonElement) {
  
  /** Button used to convert currency. */
  const button = document.createElement("button");
  button.classList.add(...cancelButtonPointer.classList);
  button.type = "button";
  button.textContent = `Convert from ${readable}`;
  button.addEventListener("click", async () => {
    const currency = await getCurrencyRate(
      metadata.date,
      account?.currency?.code,
    );
    console.ynab("clicked proski");
    await navigator.clipboard.writeText(currency.toString());
  });

  buttonCancel.insertAdjacentElement("beforebegin", button);
}