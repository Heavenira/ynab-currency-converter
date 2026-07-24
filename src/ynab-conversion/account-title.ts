import {
  CURRENCY_CODES,
  CurrencyCode,
  CurrencySymbol,
  isCurrencySymbol,
} from "../types/ynab";

interface AccountInfo {
  code: CurrencyCode;
  symbol: CurrencySymbol;
  readable: string;
}

/**
 * Extracts the currency code + symbol.
 * @param title Hello.
 */
export function parseAccountTitle(title: string): AccountInfo | undefined {
  for (const code of CURRENCY_CODES) {
    const regex = new RegExp(`(\\S+)(${code})(?:\\b|\\))`);
    const match = title.match(regex);
    if (match) {
      const symbol = match[1].replaceAll(/[()]/g, "");
      if (!isCurrencySymbol(symbol)) continue;

      const code = match[2] as CurrencyCode;
      const readable = `${symbol}${code}`;
      return {
        symbol,
        code,
        readable,
      };
    }
  }

  return undefined;
}
