import { CURRENCY_SYMBOLS } from "../types/ynab";

export type CurrencyFormat =
  | "123,456.78"
  | "123.456,78"
  | "123 456.78"
  | "123'456.78"
  | "123 456-78"
  | "123 456,78"
  | "123,456/78"
  | "1,23,456.78";

function getCurrencyFormat() {
  const exampleCurrency = unsafeWindow.ynab?.formatCurrency(123456780) as
    CurrencyFormat | undefined;
  if (!exampleCurrency) throw Error("Cannot acquire the currency format.");
  return exampleCurrency;
}

/**
 * Takes in a currency string and outputs the value as a float.
 * @param amount The stringified value from YNAB.
 */
export function parseCurrency(amount: string): number {
  if (!amount) throw Error("Failed to parse empty amount.");

  // Deletes any symbols.
  for (const currency of CURRENCY_SYMBOLS) {
    amount = amount.replace(currency, "");
  }

  const format = getCurrencyFormat();

  switch (format) {
    case "123,456.78":
    case "1,23,456.78":
      return parseFloat(amount.replace(/,/g, ""));
    case "123.456,78":
      return parseFloat(amount.replace(/\./g, "").replace(",", "."));
    case "123 456.78":
      return parseFloat(amount.replace(/\s/g, ""));
    case "123'456.78":
      return parseFloat(amount.replace(/'/g, ""));
    case "123 456-78":
      return parseFloat(amount.replace(/\s/g, "").replace("-", "."));
    case "123 456,78":
      return parseFloat(amount.replace(/\s/g, "").replace(",", "."));
    case "123,456/78":
      return parseFloat(amount.replace(/,/g, "").replace("/", "."));
  }
}

/** Groups an unsigned integer digit string every 3 digits from the right. */
function groupThousands(integerPart: string, separator: string): string {
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/** Groups an unsigned integer digit string using the Indian numbering system. */
function groupIndian(integerPart: string, separator: string): string {
  const lastThree = integerPart.slice(-3);
  const rest = integerPart.slice(0, -3);
  if (!rest) return lastThree;
  return (
    rest.replace(/\B(?=(\d{2})+(?!\d))/g, separator) + separator + lastThree
  );
}

/**
 * Takes in a float and outputs it as a currency string, formatted per YNAB's settings.
 * @param amount The value to format.
 */
export function formatCurrency(amount: number): string {
  const format = getCurrencyFormat();

  /** Technically YNAB should never need this, but good to be sure :) */
  const sign = amount < 0 ? "-" : "";
  const [integerPart, fractionPart] = Math.abs(amount).toFixed(2).split(".");

  switch (format) {
    case "123,456.78":
      return `${sign}${groupThousands(integerPart, ",")}.${fractionPart}`;
    case "1,23,456.78":
      return `${sign}${groupIndian(integerPart, ",")}.${fractionPart}`;
    case "123.456,78":
      return `${sign}${groupThousands(integerPart, ".")},${fractionPart}`;
    case "123 456.78":
      return `${sign}${groupThousands(integerPart, " ")}.${fractionPart}`;
    case "123'456.78":
      return `${sign}${groupThousands(integerPart, "'")}.${fractionPart}`;
    case "123 456-78":
      return `${sign}${groupThousands(integerPart, " ")}-${fractionPart}`;
    case "123 456,78":
      return `${sign}${groupThousands(integerPart, " ")},${fractionPart}`;
    case "123,456/78":
      return `${sign}${groupThousands(integerPart, ",")}/${fractionPart}`;
  }
}
