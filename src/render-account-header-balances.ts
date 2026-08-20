import { getCurrencyRate } from "./convert-currency";
import { isHTMLSpan } from "./helpers";
import {
  accounts,
  formatCurrency,
  getToday,
  parseCurrency,
} from "./ynab-conversion";
import { defaultCurrency } from "./ynab-conversion/accounts";

export function observeAccountHeaderBalances() {
  const main = document.querySelector(".accounts-header-balances");
  if (!main) return;

  const cleared = main.querySelector(
    "div.accounts-header-balances-cleared > .user-data",
  );
  const uncleared = main.querySelector(
    "div.accounts-header-balances-uncleared > .user-data",
  );
  const working = main.querySelector(
    "div.accounts-header-balances-working > .user-data",
  );

  if (!cleared || !uncleared || !working) {
    throw Error("Failed to query account balances correctly.");
  }

  for (const container of [cleared, uncleared, working]) {
    for (const child of container.childNodes) {
      renderAccountHeaderBalance(child).catch((error) => {
        throw Error("Failed to render account header balance.", error);
      });
    }
  }

  observeCleared.observe(cleared, { childList: true });
  observeUncleared.observe(uncleared, { childList: true });
  observeWorking.observe(working, { childList: true });
}

const observeCleared = new MutationObserver(callbackAccountHeaderBalance);
const observeUncleared = new MutationObserver(callbackAccountHeaderBalance);
const observeWorking = new MutationObserver(callbackAccountHeaderBalance);

function callbackAccountHeaderBalance(mutations: MutationRecord[]) {
  for (const mutation of mutations) {
    for (const addedNode of mutation.addedNodes) {
      renderAccountHeaderBalance(addedNode).catch((error) => {
        throw Error("Failed to render account header balance.", error);
      });
    }
  }
}

const IS_CONVERTED = "is-visually-converted";

async function renderAccountHeaderBalance(span: Node) {
  if (!isHTMLSpan(span)) return;
  if (!span.textContent) return;

  const account = accounts.getCurrent();
  if (!account || account.currency.code === defaultCurrency.code) return;

  const isConverted = span.classList.contains(IS_CONVERTED);
  if (isConverted) return;

  const isNegative = span.classList.contains("negative");
  const value = parseCurrency(span.textContent.slice(isNegative ? 1 : 0));

  const today = getToday();
  const rate = await getCurrencyRate(today, account.currency.code);

  const converted = value * rate;

  const foreignSymbol =
    account.currency.symbol === defaultCurrency.symbol
      ? `${account.currency.code}${account.currency.symbol}`
      : account.currency.symbol;

  let stringified = formatCurrency(converted, foreignSymbol);
  if (isNegative) {
    stringified = "−" + stringified;
  }

  span.textContent = stringified;
  span.classList.add(IS_CONVERTED);
}
