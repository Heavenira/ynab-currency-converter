import { accounts } from "./ynab-conversion";
import { isHTMLDiv, analyzeRow } from "./analyze-row";
import { renderMetadata } from "./render-row";

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
  const account = accounts.getCurrent();
  const readable = account?.currency?.readable;

  const inputCells: HTMLInputElement[][] = [];
  let buttonCancel: HTMLButtonElement | null = null;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      const analysis = analyzeRow(node);
      if (analysis.inputCells) inputCells.push(analysis.inputCells);
      if (analysis.buttonCancel) buttonCancel = analysis.buttonCancel;
      if (analysis.metadata) {
        renderMetadata(analysis.metadata, true);
      }
    }
  }

  if (buttonCancel) {
    /** Button used to convert currency. */
    const buttonProski = document.createElement("button");
    buttonProski.classList.add(...buttonCancel.classList);
    buttonProski.type = "button";
    buttonProski.textContent = `Convert from ${readable}`;
    buttonProski.addEventListener("click", () => {
      console.ynab("clicked proski");
    });

    buttonCancel.insertAdjacentElement("beforebegin", buttonProski);
  }
});

observerBody.observe(document.body, {
  childList: true,
});
