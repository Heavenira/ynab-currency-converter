import { getCurrencyRate } from "./convert-currency";
import { simulateTyping } from "./helpers";
import {
  AccountInfo,
  formatCurrency,
  Metadata,
  parseCurrency,
  parseDate,
} from "./ynab-conversion";
import { defaultCurrency } from "./ynab-conversion/accounts";

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
  if (account.currency.code === defaultCurrency.code) return;

  const foreignSymbol =
    account.currency.symbol === defaultCurrency.symbol
      ? `${account.currency.code}${account.currency.symbol}`
      : account.currency.symbol;
  const localSymbol =
    account.currency.symbol === defaultCurrency.symbol
      ? `${defaultCurrency.code}${defaultCurrency.symbol}`
      : defaultCurrency.symbol;

  let mostRecentFloat = 0;
  const getText = async (value: string, mode: "toForeign" | "toLocal") => {
    const float = parseCurrency(value);
    if (float) mostRecentFloat = float;
    const rate = await getCurrencyRate(
      parseDate(pointers.date.value),
      account.currency?.code,
    );
    if (float) {
      if (mode === "toLocal") {
        return `Convert ${formatCurrency(float, foreignSymbol)} to ${formatCurrency(float / rate, localSymbol)}`;
      }
      if (mode === "toForeign") {
        return `Convert ${formatCurrency(float, localSymbol)} to ${formatCurrency(float * rate, foreignSymbol)}`;
      }
    } else {
      if (mode === "toLocal") {
        return `Convert to ${defaultCurrency.readable}`;
      }
      if (mode === "toForeign") {
        return `Convert from ${account.currency?.readable}`;
      }
    }

    return `UNREACHABLE`;
  };

  /** Button used to convert currency. */
  const makeButton = (mode: "toForeign" | "toLocal") => (text: string) => {
    const button = document.createElement("button");
    pointers.cancelButton.insertAdjacentElement("beforebegin", button);
    button.classList.add(...pointers.cancelButton.classList);
    button.type = "button";
    button.textContent = text;

    for (const flow of [pointers.outflow, pointers.inflow]) {
      flow.addEventListener("input", () => {
        getText(flow.value, mode)
          .then((text) => (button.textContent = text))
          .catch((error) => {
            throw Error(`Failed executing getText updating input: ${error}`);
          });
      });
    }

    button.addEventListener("click", async () => {
      const metadata = new Metadata({
        date: pointers.date.value,
        inflow: pointers.inflow.value,
        outflow: pointers.outflow.value,
        memo: pointers.memo.value,
        rowId,
      });

      const rate = await getCurrencyRate(metadata.date, account.currency?.code);

      let inputDOM: HTMLInputElement | undefined = undefined;
      let inputRate = NaN;
      if (metadata.inflow.ynab > 0) {
        metadata.inflow.bankValue =
          mode === "toForeign" ? metadata.inflow.ynab * rate : mostRecentFloat;
        metadata.inflow.driftPercent = undefined;
        inputDOM = pointers.inflow;
        inputRate = metadata.inflow.ynab / rate;
      }
      if (metadata.outflow.ynab > 0) {
        metadata.outflow.bankValue =
          mode === "toForeign" ? metadata.outflow.ynab * rate : mostRecentFloat;
        metadata.outflow.driftPercent = undefined;
        inputDOM = pointers.outflow;
        inputRate = metadata.outflow.ynab / rate;
      }

      const stringified = metadata.stringify().trim();
      simulateTyping(pointers.memo, stringified, false);
      if (inputDOM && mode === "toLocal")
        simulateTyping(inputDOM, `${formatCurrency(inputRate)}`, true);
      button.textContent = "Updated!";
    });
  };

  getText(pointers.outflow.value || pointers.inflow.value, "toLocal")
    .then(makeButton("toLocal"))
    .catch((error) => {
      throw Error(
        `Failed executing getText after initializing button 1: ${error}`,
      );
    });

  getText(pointers.outflow.value || pointers.inflow.value, "toForeign")
    .then(makeButton("toForeign"))
    .catch((error) => {
      throw Error(
        `Failed executing getText after initializing button 2: ${error}`,
      );
    });
}
