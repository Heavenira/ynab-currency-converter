import { analyzeRow } from "./analyze-row";
import { getCurrencyRate } from "./convert-currency";
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
async function obtainFinal(metadata: Metadata, accountName: string) {
  const { inflow, outflow, bankInflow, bankOutflow, rateInflow, rateOutflow } =
    metadata;

  let account = accounts.getCurrent();
  if (!account) account = accounts.getName(accountName);
  if (!account) return undefined;

  let mode: "blank" | "inflow" | "outflow" = "blank";
  if (inflow > 0) mode = "inflow";
  if (outflow > 0) mode = "outflow";

  let bankGiven: number | undefined = undefined;
  let rateGiven: number | undefined = undefined;
  switch (mode) {
    case "blank":
      break;
    case "inflow":
      bankGiven = bankInflow;
      rateGiven = rateInflow;
      break;
    case "outflow":
      bankGiven = bankOutflow;
      rateGiven = rateOutflow;
      break;
  }

  if (account.currency?.code) {
    const conversion = await getCurrencyRate(
      "CAD",
      account.currency.code,
      metadata.date,
    );

    const target = conversion;
    const given = rateGiven ?? conversion;
    const percentError = (Math.abs(given - target) / Math.abs(target)) * 100;

    return {
      account,
      bank: bankGiven,
      rate: given,
      mode,
      percentError,
    };
  }
}

/** Takes in metadata and overwrites the present DOM on screen of this metadata. */
export function renderMetadata(
  metadata: Metadata,
  isAttachingObservers: boolean,
) {
  const { rowId, outflow, inflow } = metadata;

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
      const { account, mode, bank, rate, percentError } = final;
      if (mode === "blank") return;

      const dom = mode === "inflow" ? inflowDOM : outflowDOM;
      const ynabValue = mode === "inflow" ? inflow : outflow;

      const displayValue = formatCurrency(
        bank ?? ynabValue * rate,
        account.currency?.symbol,
      );
      dom.textContent = displayValue;
    })
    .catch((error) => {
      throw Error(`Failed executing renderMetadata: ${error}`);
    });
}
