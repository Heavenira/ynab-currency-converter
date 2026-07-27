import {
  CURRENCY_CODES,
  CurrencyCode,
  CurrencySymbol,
  isCurrencySymbol,
} from "../types/ynab";

interface AccountCurrency {
  code: CurrencyCode;
  symbol: CurrencySymbol;
  readable: string;
}

export const defaultCurrency: AccountCurrency = {
  code: "CAD",
  symbol: "$",
  readable: "$CAD",
};

function hashStringToBase36(str: string) {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }

  return (hash >>> 0).toString(36);
}

const regexAccountId =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/accounts\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

export interface AccountInfo {
  accountId: string;
  hash: string;
  name: string;
  currency: AccountCurrency;
}

class Accounts {
  all: AccountInfo[];

  /**
   * Keeps track of all the account information in the browser.
   */
  constructor() {
    this.all = [];
    this.registerAll();
  }

  private registerId(accountId: string) {
    if (this.all.find((x) => x.accountId === accountId)) return;

    const hash = hashStringToBase36(accountId);

    const navDOM = document.querySelector(`a[data-account-id="${accountId}"]`);
    if (!navDOM) throw Error(`Unable to find account ID ${accountId}`);

    const nameDOM = navDOM.querySelector("div.nav-account-name");
    const name = nameDOM?.getAttribute("title")?.trim();
    if (!name) throw Error(`Unable to locate name for account ID ${accountId}`);

    let currency: AccountCurrency | undefined = undefined;
    for (const code of CURRENCY_CODES) {
      const regex = new RegExp(`(\\S+)(${code})(?:\\b|\\))`);
      const match = name.match(regex);
      if (match) {
        const symbol = match[1].replaceAll(/[()]/g, "");
        if (!isCurrencySymbol(symbol)) continue;

        const code = match[2] as CurrencyCode;
        const readable = `${symbol}${code}`;
        currency = {
          symbol,
          code,
          readable,
        };
      }
    }

    if (!currency) {
      currency = structuredClone(defaultCurrency);
    }

    this.all.push({
      accountId,
      hash,
      name,
      currency,
    });
  }

  private registerAll() {
    for (const a of document.querySelectorAll<HTMLAnchorElement>(
      "a.nav-account-row",
    )) {
      const match = a.href.match(regexAccountId);
      if (!match) return;
      const accountId = match[1];
      this.registerId(accountId);
    }
  }

  getCurrent() {
    this.registerAll();

    const a = document.querySelector<HTMLAnchorElement>(
      "a.nav-account-row.is-selected",
    );
    if (!a) return;
    const match = a.href.match(regexAccountId);
    if (!match) return;
    const accountId = match[1];

    const account = this.all.find((x) => x.accountId === accountId);
    return account;
  }

  getHash(hash: string) {
    this.registerAll();
    const account = this.all.find((x) => x.hash === hash);
    return account;
  }

  getName(accountName: string) {
    this.registerAll();
    const account = this.all.find((x) => x.name === accountName);
    return account;
  }
}

export const accounts = new Accounts();
