import { isHTMLDiv, isHTMLSpan } from "./helpers";
import { getCurrencyRate } from "./convert-currency";
import {
  accounts,
  formatCurrency,
  getToday,
  parseCurrency,
} from "./ynab-conversion";
import { defaultCurrency } from "./ynab-conversion/accounts";

/** Tracks which `.currency` elements already have an observer attached. */
const observedCurrencyDOMs = new Set<Element>();

const IS_CONVERTED = "is-visually-converted";

/** Overwrites a mutated nav account row value with the real-time converted currency. */
async function renderNavAccountValue(target: HTMLSpanElement) {
  const row = target.closest<HTMLAnchorElement>("a.nav-account-row");
  if (!row) return;

  const name = row
    .querySelector("div.nav-account-name")
    ?.getAttribute("title")
    ?.trim();
  if (!name) return;

  const account = accounts.getName(name);
  if (!account || account.currency.code === defaultCurrency.code) return;

  const isNegative = target.classList.contains("negative");
  const value = parseCurrency(
    target.textContent?.slice(isNegative ? 1 : 0) ?? "",
  );

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

  const overwriteDOM = target.querySelector(":scope > span");
  if (!overwriteDOM) throw Error("Missing overwriteDOM for changing text.");

  const isConverted = overwriteDOM.classList.contains(IS_CONVERTED);
  if (isConverted) return;

  overwriteDOM.textContent = stringified;
  overwriteDOM.classList.add(IS_CONVERTED);
}

/** Dispatched whenever a nav account row's `.currency` element mutates. */
function handleCurrencyMutation(mutations: MutationRecord[]) {
  for (const mutation of mutations) {
    const { target } = mutation;
    if (!(isHTMLDiv(target) || isHTMLSpan(target))) continue;

    // Only trigger this if the mutated value is a numeric value.
    if (!target.classList.contains("nav-account-value")) continue;

    renderNavAccountValue(target).catch((error) => {
      throw Error(`Failed executing renderNavAccountValue: ${error}`);
    });
  }
}

/** Attaches a mutation observer to every nav account row's `.currency` element. */
export function observeNavAccountCurrencies() {
  const currencyDOMs =
    document.querySelectorAll<HTMLElement>(".nav-account-row");

  for (const currencyDOM of currencyDOMs) {
    if (observedCurrencyDOMs.has(currencyDOM)) continue;
    observedCurrencyDOMs.add(currencyDOM);

    // Perform the replacement at the start of the page.
    const valueDOM = currencyDOM.querySelector<HTMLDivElement>(
      ":scope > .nav-account-value",
    );
    if (valueDOM) {
      renderNavAccountValue(valueDOM).catch((error) => {
        throw Error(`Failed executing renderNavAccountValue: ${error}`);
      });
    }

    const observer = new MutationObserver(handleCurrencyMutation);
    observer.observe(currencyDOM, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }
}
