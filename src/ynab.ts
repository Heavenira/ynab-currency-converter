import { accounts, parseDate } from "./ynab-conversion";
import { analyzeRow, AnalysisResult } from "./analyze-row";
import { renderMetadata } from "./render-row";
import { getCurrencyRate } from "./convert-currency";
import { renderButton, RenderButtonPointers } from "./render-button";
import { isHTMLDiv } from "./helpers";

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
            const rows = gridBody.querySelectorAll<HTMLDivElement>(
              ":scope > div.ynab-grid-body-row[data-row-id]",
            );
            for (const row of rows) {
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

  const pointers: Partial<RenderButtonPointers> = {};

  const keysPointer: (keyof RenderButtonPointers)[] = [
    "cancelButton",
    "date",
    "memo",
    "inflow",
    "outflow",
  ];

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!isHTMLDiv(node)) continue;

      const analysis = analyzeRow(node);

      if (analysis.inputCells) {
        const selectInput = (selector: string) =>
          analysis.inputCells?.find((x) => x.closest(selector));

        // If there is no current account, we can locate it via the input cells
        if (!account) {
          const input = selectInput(".ynab-grid-cell-accountName");
          if (input) account = accounts.getName(input.value.trim());
        }

        if (!pointers.date) {
          const input = selectInput(".ynab-grid-cell-date");
          if (input) pointers.date = input;
        }

        if (!pointers.memo) {
          const input = selectInput(".ynab-grid-cell-memo");
          if (input) pointers.memo = input;
        }

        if (!pointers.inflow) {
          const input = selectInput(".ynab-grid-cell-inflow");
          if (input) pointers.inflow = input;
        }

        if (!pointers.outflow) {
          const input = selectInput(".ynab-grid-cell-outflow");
          if (input) pointers.outflow = input;
        }
      }
      if (analysis.buttonCancel) pointers.cancelButton = analysis.buttonCancel;
      if (analysis.metadata) {
        renderMetadata(analysis.metadata, true);
      }
    }
  }

  if (account && keysPointer.every((key) => pointers[key])) {
    renderButton(account, "", pointers as Required<typeof pointers>);
  }
});

observerBody.observe(document.body, {
  childList: true,
});
