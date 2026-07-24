import { analyzeRow } from "./analyze-row";
import {
  AccountInfo,
  accountStorage,
  formatCurrency,
  Metadata,
} from "./ynab-conversion";

export function renderMetadata(
  metadata: Metadata,
  isAttachingObservers: boolean,
) {
  const { inflow, outflow, rowId, value1, value2, hash1, hash2 } = metadata;

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

  const current = accountStorage.getCurrent();

  let finalAccount: AccountInfo | undefined = undefined;
  let finalValue: number | undefined = undefined;

  if (current) {
    if (hash1 === current.hash) {
      finalAccount = current;
      finalValue = value1;
    } else if (hash2 === current.hash) {
      finalAccount = current;
      finalValue = value2;
    }
  }
  if (!finalAccount) {
    if (!hash2 || value2 === undefined) {
      finalAccount = accountStorage.getFromHash(hash1);
      finalValue = value1;
    } else if (outflow > 0) {
      finalAccount = accountStorage.getFromHash(hash2);
      finalValue = value2;
    } else if (inflow > 0) {
      finalAccount = accountStorage.getFromHash(hash1);
      finalValue = value2;
    }
  }

  if (!finalAccount) {
    //throw Error(`Could not find an account associated with ${JSON.stringify(metadata)}`);
  }

  if (isAttachingObservers) mutationBuffer.create(rowId);

  let value: number;

  console.log("account", finalAccount);

  if (finalValue !== undefined && finalValue !== -1) {
    const stringified =
      finalAccount?.currency?.symbol + formatCurrency(finalValue);
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

  /**
   * This dispatches when an observer event is triggered, particularly
   * looking for when nodes are removed from the DOM.
   */
  static mutationCallback(mutations: MutationRecord[]) {
    // Look for cells that are killed.
    for (const mutation of mutations) {
      // This killed cell is outlived by its neighboring survivor.
      const { nextSibling } = mutation;
      if (!nextSibling) continue;

      // We grab the parent of the living cell...
      const { parentElement } = nextSibling;
      if (!parentElement) continue;

      // ...then ascend upwards until we hit the row DOM.
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
    }

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

export const mutationBuffer = new RowMutationBuffer();
