import { Metadata, parseCurrency, parseDate } from "./ynab-conversion";
import { parseAccountTitle } from "./ynab-conversion/account-title";

/** Returns if a node is of type. `HTMLDivElement` */
function isHTMLDiv(node: Node): node is HTMLDivElement {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as HTMLElement).tagName === "DIV"
  );
}

/** Query selects a node element and retrieves its text content. */
function getText(node: HTMLElement, selector: string) {
  return node.querySelector(selector)?.textContent.trim() || "";
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
          // Handles rows that already exist before the observer attaches.
          setTimeout(()=> {
            for (const row of gridBody.querySelectorAll(
              ":scope > .ynab-grid-body-row",
            )) {
              obtainSelectedRowsAndButton(row);
            }
          }, 2000);
          

          observerGrid.observe(gridBody, {
            childList: true,
          });
        }
      }
    }
  }
});

/**
 * Grabs the button and row of a single added node, if applicable.
 * @param node The added node to inspect.
 */
function obtainSelectedRowsAndButton(node: Node): {
  /** The input cells of this specific row, if this node is an editing row. */
  inputCells: HTMLInputElement[] | null;
  /** The button to cancel editing this row, if this node contains it. */
  buttonCancel: HTMLButtonElement | null;
  metadata: Metadata | null;
} {
  // Only operate on rows inside of the YNAB grid.
  if (!isHTMLDiv(node) || !node.classList.contains("ynab-grid-body-row")) {
    return { inputCells: null, buttonCancel: null, metadata: null };
  }

  // Returns the input values of this row.
  if (node.classList.contains("is-editing")) {
    return {
      inputCells: [
        ...node.querySelectorAll<HTMLInputElement>("input.ember-text-field"),
      ],
      buttonCancel: null,
      metadata: null,
    };
  }

  // Returns the cancel button of this row.
  if (node.classList.contains("ynab-grid-actions")) {
    return {
      inputCells: null,
      buttonCancel: document.querySelector<HTMLButtonElement>(
        ".ynab-grid-actions-buttons > button.button-cancel-small",
      ),
      metadata: null,
    };
  }

  const rowId = node.getAttribute("data-row-id");
  // Locates the cells which needs a conversion.
  if (node.classList.contains("ynab-grid-body-parent") && rowId) {

    const getString = (type: string) =>
      getText(node, `.ynab-grid-cell-${type}`);

    const metadata = new Metadata({
      date: getString("date"),
      inflow: getString("inflow"),
      outflow: getString("outflow"),
      memo: getString("memo"),
      rowId,
    });

    return { inputCells: null, buttonCancel: null, metadata };
  }

  return { inputCells: null, buttonCancel: null, metadata: null };
}

/** Observer meant to be executed as soon as the transaction grid is realized. */
const observerGrid = new MutationObserver((mutations) => {
  /** The current account title of the page. */
  const title = getText(document.body, ".js-accounts-header-account-name");

  const currency = parseAccountTitle(title);

  const inputCells: HTMLInputElement[][] = [];
  let buttonCancel: HTMLButtonElement | null = null;
  let metadata: Metadata | null = null;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      const row = obtainSelectedRowsAndButton(node);
      if (row.inputCells) inputCells.push(row.inputCells);
      if (row.buttonCancel) buttonCancel = row.buttonCancel;
      if (row.metadata) {
        metadata = row.metadata;
        console.ynab("ezra", metadata);
      }
    }
  }

  if (!buttonCancel) return;

  /** Button used to convert currency. */
  const buttonProski = document.createElement("button");
  buttonProski.classList.add(...buttonCancel.classList);
  buttonProski.type = "button";
  buttonProski.textContent = `Convert from ${currency?.readable}`;
  buttonProski.addEventListener("click", () => {
    console.ynab("clicked proski");
  });

  buttonCancel.insertAdjacentElement("beforebegin", buttonProski);
});

observerBody.observe(document.body, {
  childList: true,
});
