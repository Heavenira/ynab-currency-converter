import { accounts, parseDate } from "./ynab-conversion";
import { isHTMLDiv, analyzeRow, AnalysisResult } from "./analyze-row";
import { renderMetadata } from "./render-row";
import { getCurrencyRate } from "./convert-currency";

/** Observer meant to be executed as soon as `document.body` exists. */
export const observerBody = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      // This declares the beginning of our YNAB body.
      if (
        isHTMLDiv(node) &&
        node.classList.contains("layout") &&
        node.classList.length === 1
      ) {
        /** The grid body, containing all the transaction entries. */
        const gridBody = node.querySelector(".ynab-grid-body");
        if (gridBody) {
          // Handles rows that already exist before the observer attaches.
          setTimeout(() => {
            for (const row of gridBody.querySelectorAll<HTMLDivElement>(
              ":scope > div.ynab-grid-body-row",
            )) {
              const { metadata } = analyzeRow(row);
              if (!metadata) return;
              renderMetadata(metadata, true);
            }
          }, 1);

          observerGrid.observe(gridBody, {
            childList: true,
          });
        }
      }
    }
  }
});

/** Observer meant to be executed as soon as the transaction grid is realized. */
const observerGrid = new MutationObserver((mutations) => {
  let account = accounts.getCurrent();
  let date: string | undefined = undefined;

  const inputCells: HTMLInputElement[][] = [];
  let buttonCancel: HTMLButtonElement | null = null;
  let firstAnalysis: AnalysisResult | undefined = undefined;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      const analysis = analyzeRow(node);

      if (!firstAnalysis) firstAnalysis = analysis;
      if (analysis.inputCells) {
        inputCells.push(analysis.inputCells);

        // If there is no current account, we can locate it via the input cells
        if (!account) {
          const textField = analysis.inputCells.find((x) =>
            x.parentElement!.classList.contains("ynab-grid-cell-accountName"),
          );
          if (textField) account = accounts.getName(textField.value.trim());
        }

        if (!date) {
          const textField = analysis.inputCells.find((x) =>
            x.parentElement!.classList.contains("ynab-grid-cell-date"),
          );
          if (textField) date = textField.value.trim();
        }
      }
      if (analysis.buttonCancel) buttonCancel = analysis.buttonCancel;
      if (analysis.metadata) {
        renderMetadata(analysis.metadata, true);
      }
    }
  }

  const readable = account?.currency?.readable;

  if (buttonCancel && firstAnalysis && date) {
    const { metadata } = firstAnalysis;

    /** Button used to convert currency. */
    const buttonProski = document.createElement("button");
    buttonProski.classList.add(...buttonCancel.classList);
    buttonProski.type = "button";
    buttonProski.textContent = `Convert from ${readable}`;
    buttonProski.addEventListener("click", async () => {
      const currency = await getCurrencyRate(
        parseDate(date),
        account?.currency?.code,
      );
      console.ynab("clicked proski");
      await navigator.clipboard.writeText(currency.toString());
    });

    buttonCancel.insertAdjacentElement("beforebegin", buttonProski);
  }
});

observerBody.observe(document.body, {
  childList: true,
});
