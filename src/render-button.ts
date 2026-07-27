import { getCurrencyRate } from "./convert-currency";
import { simulateTyping } from "./helpers";
import {
  AccountInfo,
  formatCurrency,
  Metadata,
  parseDate,
} from "./ynab-conversion";

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

  const getText = async (value: string) => {
    const float = parseFloat(value);
    const rate = await getCurrencyRate(
      parseDate(pointers.date.value),
      account.currency?.code,
    );
    if (float)
      return `Convert from ${formatCurrency(float, account.currency?.symbol)} to ${formatCurrency(float * rate)}`;
    return `Convert from ${account.currency?.readable}`;
  };

  /** Button used to convert currency. */
  const button = document.createElement("button");
  pointers.cancelButton.insertAdjacentElement("beforebegin", button);
  button.classList.add(...pointers.cancelButton.classList);
  button.type = "button";

  getText(pointers.outflow.value || pointers.inflow.value)
    .then((text) => {
      button.textContent = text;

      for (const flow of [pointers.outflow, pointers.inflow]) {
        flow.addEventListener("input", () => {
          getText(flow.value)
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

        await navigator.clipboard.writeText(stringified);
        button.textContent = "Copied!";

        simulateTyping(pointers.memo, stringified);
      });
    })
    .catch((error) => {
      throw Error(
        `Failed executing getText after initializing button: ${error}`,
      );
    });
}
