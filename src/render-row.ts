import { analyzeRow } from "./analyze-row";
import {
  AccountInfo,
  accounts,
  formatCurrency,
  Metadata,
} from "./ynab-conversion";

/** Maps all the observers that are currently active on the page. */
const bufferObservers: Map<Element, MutationObserver> = new Map();

/** Stores the last timestamp a garbage collection was executed. */
let previousGarbageCollection = Date.now();
/** Garbage collects the buffer in case there are any non-existent pointers. */
function garbageCollect() {
  const now = Date.now();
  // Garbage collect only every 5 seconds.
  if (now - previousGarbageCollection < 1000 * 5) return;
  previousGarbageCollection = now;

  let removedCount = 0;
  for (const element of [...bufferObservers.keys()]) {
    if (!element.isConnected) {
      const observer = bufferObservers.get(element);
      observer?.disconnect();
      bufferObservers.delete(element);
      removedCount++;
    }
  }
  console.log("Removed", removedCount, "buffer(s)");
}

/** Dispatched dispatches when a row is removed from the DOM. */
function handleCellRemoval(mutations: MutationRecord[]) {
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

/** Creates new mutation observers given metadata. */
function attachRowObservers(metadata: Metadata) {
  const { rowId } = metadata;
  const gridCell = document.querySelector(
    `.ynab-grid-body-row[data-row-id="${rowId}"] .ynab-grid-cell-inflow`,
  );
  if (!gridCell) return;

  // Only new observers go to the buffer.
  if (!bufferObservers.has(gridCell)) {
    const observer = new MutationObserver(handleCellRemoval);
    observer.observe(gridCell, { childList: true });
    bufferObservers.set(gridCell, observer);
  }
}

/**
 * Obtains the value that will be used for the calculation.
 * @param metadata The metadata that was already retrieved.
 * @param accountName The name of this column, if it is specified.
 * @returns
 */
function obtainFinal(metadata: Metadata, accountName: string) {
  const { value1, hash1, value2, hash2, inflow, outflow } = metadata;
  let finalAccount: AccountInfo | undefined = undefined;
  let finalValue: number | undefined = undefined;

  let current = accounts.getCurrent();
  if (!current) current = accounts.getName(accountName);
  if (!current) return undefined;

  // CASE ONE: Is there no metadata existing?
  if (value1 === -1 || !hash1) {
    finalAccount = current;
  }

  if (!finalAccount) {
    // CASE TWO: We can compare the metadatas to `current`.
    if (value2 !== -1 && hash2) {
      const temp = accounts.getHash(hash2);
      if (temp?.hash === current.hash) {
        finalAccount = current;
        finalValue = value2;
      }
    } else if (value1 !== -1 && hash1) {
      const temp = accounts.getHash(hash1);
      if (temp?.hash === current.hash) {
        finalAccount = current;
        finalValue = value1;
      }
    }
  }

  if (!finalValue) {
    if (inflow !== 0) finalValue = inflow;
    else if (outflow !== 0) finalValue = outflow;
  }

  if (!finalAccount || !finalValue) return undefined;

  return {
    account: finalAccount,
    value: finalValue,
  };
}

/** Takes in metadata and overwrites the present DOM on screen of this metadata. */
export function renderMetadata(
  metadata: Metadata,
  isAttachingObservers: boolean,
) {
  const { value1, hash1, value2, hash2, rowId, outflow, inflow } = metadata;

  const rowDOM = document.querySelector(
    `.ynab-grid-body-row[data-row-id="${rowId}"]`,
  );
  if (!rowDOM) return;

  // Attaches & garbage collects the row observers.
  garbageCollect();
  if (isAttachingObservers) attachRowObservers(metadata);

  const inflowDOM = rowDOM.querySelector(
    ".ynab-grid-cell-inflow > .tabular-nums",
  );
  const outflowDOM = rowDOM.querySelector(
    ".ynab-grid-cell-outflow > .tabular-nums",
  );
  const memoDOM = rowDOM.querySelector(".ynab-grid-cell-memo > span");
  const accountDOM = rowDOM.querySelector(".ynab-grid-cell-accountName > span");
  if (!inflowDOM || !outflowDOM || !memoDOM) return;

  //inflowDOM.textContent = "42069";
  //outflowDOM.textContent = "42069";

  const final = obtainFinal(metadata, accountDOM?.textContent.trim() ?? "");
  if (!final) return;

  if (value1 !== -1) {
    const account = accounts.getCurrent();
    const stringified = final.account.currency?.symbol + formatCurrency(value1);
    inflowDOM.textContent = stringified;
    outflowDOM.textContent = stringified;
  }
}
