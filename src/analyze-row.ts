import { isHTMLDiv } from "./helpers";
import { Metadata } from "./ynab-conversion";

/** Query selects a node element and retrieves its text content. */
export function getText(node: HTMLElement, selector: string) {
  return node.querySelector(selector)?.textContent.trim() || "";
}

export type AnalysisResult = {
  /** The input cells of this specific row, if this node is an editing row. */
  inputCells: HTMLInputElement[] | null;
  /** The button to cancel editing this row, if this node just contains a button. */
  buttonCancel: HTMLButtonElement | null;
  /** The metadata of this row. */
  metadata: Metadata | null;
};

/**
 * Analyzes a `ynab-grid-body-row` DOM element from YNAB.
 * This will grab if there are any buttons, the input
 * cells themselves, and metadata if there is any available.
 * @param node The added node to inspect.
 */
export function analyzeRow(node: Node): AnalysisResult {
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
