import { analyzeRow } from "./analyze-row";
import { getCurrencyRate } from "./convert-currency";
import { dismissToast, registerToast } from "./render-toast";
import {
  AccountInfo,
  accounts,
  formatCurrency,
  Metadata,
} from "./ynab-conversion";
import { defaultCurrency } from "./ynab-conversion/accounts";
import { REGEX_INFLOW, REGEX_OUTFLOW } from "./ynab-conversion/metadata-memo";

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
  dismissToast();

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

interface ObtainFinalResult {
  /** The account this row's transaction belongs to. */
  account: AccountInfo;
  /** The bank-reported value shown in the row, in the account's currency. */
  valueDisplay: number | undefined;
  /** The bank-reported value shown in the row, multiplied by its user-reported drift multiplier. */
  valueAfterMultiplication: number | undefined;
  /** The YNAB value converted using the expected exchange rate. */
  valueExpected: number;
  /** Which column ("inflow" or "outflow") holds the YNAB value, or "blank" if neither is set. */
  mode: "blank" | "inflow" | "outflow";
  /** Which mode to use for this cell's formatting. */
  status: "estimate" | "error" | "";
}

/**
 * Obtains the value that will be used for the calculation.
 * @param metadata The metadata that was already retrieved.
 * @param accountName The name of this account, if it is specified.
 */
async function obtainFinal(
  metadata: Metadata,
  accountName: string,
): Promise<ObtainFinalResult | undefined> {
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

  let valueAfterMultiplication = valueDisplay;
  if (valueAfterMultiplication !== undefined && driftPercent !== undefined) {
    valueAfterMultiplication *= driftPercent;
  }

  const rateExpected = await getCurrencyRate(
    metadata.date,
    account.currency?.code,
  );

  const valueExpected = valueYNAB * rateExpected;

  let status: ObtainFinalResult["status"] = "";
  if (valueAfterMultiplication === undefined) {
    status = "estimate";
  } else if (Math.abs(valueExpected - valueAfterMultiplication) > 0.02) {
    status = "error";
  }

  return {
    account,
    valueDisplay,
    valueAfterMultiplication,
    valueExpected,
    mode,
    status,
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

  const inflowDOM = rowDOM.querySelector<HTMLSpanElement>(
    ".ynab-grid-cell-inflow > span.tabular-nums",
  );
  const outflowDOM = rowDOM.querySelector<HTMLSpanElement>(
    ".ynab-grid-cell-outflow > span.tabular-nums",
  );
  const memoDOM = rowDOM.querySelector<HTMLSpanElement>(
    ".ynab-grid-cell-memo > span",
  );
  const accountDOM = rowDOM.querySelector<HTMLSpanElement>(
    ".ynab-grid-cell-accountName > span",
  );
  if (!inflowDOM || !outflowDOM || !memoDOM) return;

  const accountName = accountDOM?.textContent.trim() ?? "";
  obtainFinal(metadata, accountName)
    .then((final) => {
      if (!final) return;
      const {
        account,
        valueDisplay,
        valueExpected,
        valueAfterMultiplication,
        mode,
        status,
      } = final;

      // If this is the default currency, there is nothing to do.
      if (account.currency.code === defaultCurrency.code) return;
      if (mode === "blank") return;

      const flowDOM = mode === "inflow" ? inflowDOM : outflowDOM;

      const foreignSymbol =
        account.currency.symbol === defaultCurrency.symbol
          ? `${account.currency.code}${account.currency.symbol}`
          : account.currency.symbol;

      const text = formatCurrency(valueDisplay ?? valueExpected, foreignSymbol);

      let memo = memoDOM.innerText;
      for (const regex of [REGEX_INFLOW, REGEX_OUTFLOW]) {
        memo = memo.replace(regex, `<span class="ynab-cc-dimmed">$&</span>`);
      }
      memoDOM.innerHTML = memo;

      const expected = formatCurrency(valueExpected, account.currency?.symbol);

      flowDOM.textContent = text;

      const isReconciliation = /^\d{4}\/\d\d\s*=/.test(memo);
      if (status === "estimate" && !isReconciliation) {
        flowDOM.parentElement?.classList.add("ynab-cc-estimation-bg");
        registerToast(flowDOM, `${text} is an estimation`);
      } else if (status === "error") {
        const message = `${valueAfterMultiplication !== undefined ? formatCurrency(valueAfterMultiplication, account.currency.symbol) : undefined} does not match ${expected}`;
        console.log(message);
        flowDOM.parentElement?.classList.add("ynab-cc-alert-bg");
        registerToast(flowDOM, message);
      }
    })
    .catch((error) => {
      throw Error(`Failed executing renderMetadata: ${error}`);
    });
}
