import { analyzeRow } from "./analyze-row";
import { getCurrencyRate } from "./convert-currency";
import { percentError } from "./helpers";
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
 * @param accountName The name of this account, if it is specified.
 */
async function obtainFinal(metadata: Metadata, accountName: string) {
  const { inflow, outflow } = metadata;

  let account = accounts.getCurrent();
  if (!account) account = accounts.getName(accountName);
  if (!account) return undefined;

  let mode: "blank" | "inflow" | "outflow" = "blank";
  let valueYNAB: number | undefined = undefined;
  if (inflow.ynab > 0) {
    valueYNAB = inflow.ynab;
    mode = "inflow";
  } else if (outflow.ynab > 0) {
    valueYNAB = outflow.ynab;
    mode = "outflow";
  }

  if (valueYNAB === undefined) return;

  /** The number to display of this currency. */
  let valueDisplay: number | undefined = undefined;
  let driftPercent: number | undefined = undefined;
  switch (mode) {
    case "blank":
      break;
    case "inflow":
      ({ bankValue: valueDisplay, driftPercent } = inflow);
      break;
    case "outflow":
      ({ bankValue: valueDisplay, driftPercent } = outflow);
      break;
  }

  let valueActual = valueDisplay;
  if (valueActual !== undefined && driftPercent !== undefined) {
    valueActual *= driftPercent;
  }

  const rateExpected = await getCurrencyRate(
    metadata.date,
    account.currency?.code,
  );

  const valueExpected = valueYNAB * rateExpected;
  const rateActual = valueActual ? valueYNAB / valueActual : rateExpected;
  const error = percentError(rateExpected, rateActual);

  return {
    account,
    valueDisplay,
    valueActual,
    valueExpected,
    rateExpected,
    rateActual,
    mode,
    error,
  };
}

/** Takes in metadata and overwrites the present DOM on screen of this metadata. */
export function renderMetadata(
  metadata: Metadata,
  isAttachingObservers: boolean,
) {
  const { rowId } = metadata;

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

  const accountName = accountDOM?.textContent.trim() ?? "";
  obtainFinal(metadata, accountName)
    .then((final) => {
      if (!final) return;
      const {
        account,
        valueDisplay,
        mode,
        valueActual,
        valueExpected,
        rateActual,
        rateExpected,
        error,
      } = final;
      if (mode === "blank") return;

      const dom = mode === "inflow" ? inflowDOM : outflowDOM;

      const text = formatCurrency(
        valueDisplay ?? valueExpected,
        account.currency?.symbol,
      );

      dom.textContent = text;
    })
    .catch((error) => {
      throw Error(`Failed executing renderMetadata: ${error}`);
    });
}
