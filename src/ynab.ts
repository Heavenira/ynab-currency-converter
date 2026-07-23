import { extractCurrency } from "./extract-currency";

/** Returns if a node is of type. `HTMLDivElement` */
function isHTMLDiv(node: Node): node is HTMLDivElement {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as HTMLElement).tagName === "DIV"
  );
}

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
          observerGrid.observe(gridBody, {
            childList: true,
          });
        }
      }
    }
  }
});

/**
 * Grabs the button and rows of the current mutation..
 * @param mutations The mutations that occurred from this observer.
 */
function obtainRowsAndButton(mutations: MutationRecord[]): {
  /** These are the input cells of this specific row. */
  inputCells: HTMLInputElement[];
  /** The button to cancel editing this row. */
  buttonCancel: HTMLButtonElement | null;
} {
  const inputCells: HTMLInputElement[] = [];
  let buttonCancel: HTMLButtonElement | null = null;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      // Only operate on rows inside of the YNAB grid.
      if (!isHTMLDiv(node) || !node.classList.contains("ynab-grid-body-row")) {
        continue;
      }

      // Adds the input values to the storage array.
      if (node.classList.contains("is-editing")) {
        inputCells.push(
          ...node.querySelectorAll<HTMLInputElement>("input.ember-text-field"),
        );
      }

      // Adds the cancel button to the storage array.
      if (node.classList.contains("ynab-grid-actions")) {
        buttonCancel = document.querySelector<HTMLButtonElement>(
          ".ynab-grid-actions-buttons > button.button-cancel-small",
        );
      }
    }
  }

  return { buttonCancel, inputCells };
}

/** Observer meant to be executed as soon as the transaction grid is realized. */
const observerGrid = new MutationObserver((mutations) => {
  /** The current account title of the page. */
  const title =
    document
      .querySelector(".js-accounts-header-account-name")
      ?.textContent.trim() || "";

  const currency = extractCurrency(title);

  const row = obtainRowsAndButton(mutations);

  if (!row.buttonCancel) return;

  /** Button used to convert currency. */
  const buttonProski = document.createElement("button");
  buttonProski.classList.add(...row.buttonCancel.classList);
  buttonProski.type = "button";
  buttonProski.textContent = `Convert from ${currency?.readable}`;
  buttonProski.addEventListener("click", () => {
    console.log("clicked proski");
  });

  row.buttonCancel.insertAdjacentElement("beforebegin", buttonProski);
});

console.log("howdy Ezra!", observerBody, document.body);

observerBody.observe(document.body, {
  childList: true,
});
