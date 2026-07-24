import { analyzeRow } from "./analyze-row";
import { formatCurrency, getAccountCurrency, Metadata } from "./ynab-conversion";

function handleCellRemoval(mutations: MutationRecord[]) {
  for (const mutation of mutations) {
    const { nextSibling } = mutation;
    if (!nextSibling) continue;

    const { parentElement } = nextSibling;
    if (!parentElement) continue;

    const rowDOM = parentElement.closest(".ynab-grid-body-row");
    if (!rowDOM) continue;

    const analysis = analyzeRow(rowDOM);
    if (!analysis.metadata) continue;

    renderMetadata(analysis.metadata, false);

    //console.log('removed node in', analyzeRow(rowDOM), rowDOM);
  }
}

export function attachRowObservers(metadata: Metadata) {
  const { rowId } = metadata;
  const gridCell = document.querySelector(
    `.ynab-grid-body-row[data-row-id="${rowId}"] .ynab-grid-cell-inflow`,
  );

  if (!gridCell) return;

  const observer = new MutationObserver(handleCellRemoval);
  buffer.push(observer);
  observer.observe(gridCell, { childList: true });
  console.log("made observer");
}

export function renderMetadata(
  metadata: Metadata,
  isAttachingObservers: boolean
) {
  const { foreignAmount, rowId, outflow, inflow } = metadata;

  if (isAttachingObservers) attachRowObservers(metadata);

  const rowDOM = document.querySelector(
    `.ynab-grid-body-row[data-row-id="${rowId}"]`,
  );

  const inflowDOM = rowDOM?.querySelector(
    ".ynab-grid-cell-inflow > .tabular-nums",
  );
  const outflowDOM = rowDOM?.querySelector(
    ".ynab-grid-cell-outflow > .tabular-nums",
  );
  if (!inflowDOM || !outflowDOM) return;

  inflowDOM.textContent = "42069";
  outflowDOM.textContent = "42069";

  if (foreignAmount !== -1) {
    const accountCurrency = getAccountCurrency();
    const stringified = accountCurrency?.symbol + formatCurrency(foreignAmount);
    inflowDOM.textContent = stringified;
    outflowDOM.textContent = stringified;
    //console.log('we can do a currency replacement!');
  }
}

const buffer: MutationObserver[] = [];

class RowMutationBuffer {

  bufferMap: Map<string, MutationObserver>;

  /**
   * Initializes a row rendering buffer.
   */
  constructor() {
    this.bufferMap = new Map();
  }

  /** This dictates how to handle whenever an observer event is called. */
  static mutationCallback(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
      const { nextSibling } = mutation;
      if (!nextSibling) continue;

      const { parentElement } = nextSibling;
      if (!parentElement) continue;

      const rowDOM = parentElement.closest(".ynab-grid-body-row");
      if (!rowDOM) continue;

      const analysis = analyzeRow(rowDOM);
      if (!analysis.metadata) continue;

      renderMetadata(analysis.metadata, false);

    }
  }

  create(rowId: string) {
    let observer = this.bufferMap.get(rowId);

    const gridCell = document.querySelector(
      `.ynab-grid-body-row[data-row-id="${rowId}"] .ynab-grid-cell-inflow`,
    );

    if (!gridCell) {
      if (observer) observer.disconnect();
      this.bufferMap.delete(rowId);
      return;
    };

    if (!observer) {
      observer = new MutationObserver(RowMutationBuffer.mutationCallback);
      this.bufferMap.set(rowId, observer);
      observer.observe(gridCell, { childList: true });
    }
  }

  clear() {
    for (const observer of this.bufferMap.values()) {
      observer.disconnect();
    }
    this.bufferMap.clear();
  }
}