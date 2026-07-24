import { CurrencyCode } from "./types/ynab";

type FetchCurrencyDate = {
  day: string;
  month: string;
  year: string;
};

type CurrencyRates<B extends CurrencyCode, C extends CurrencyCode> = {
  amount: number;
  base: B;
  date: string;
  rates: Record<C, number>;
};

async function fetchCurrency<B extends CurrencyCode, C extends CurrencyCode>(
  base: B,
  converted: C,
  date: FetchCurrencyDate,
): Promise<CurrencyRates<B, C>> {
  const formattedDate = `${date.year}-${date.month.padStart(2, "0")}-${date.day.padStart(2, "0")}`;
  const url = `https://api.frankfurter.dev/v1/${formattedDate}?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(converted)}`;

  const responseText = await new Promise<string>((res, rej) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      onload: (response) => {
        if (response.status < 200 || response.status >= 300) {
          rej(
            new Error(
              `Request failed with status ${response.status}: ${response.responseText}`,
            ),
          );
          return;
        }
        res(response.responseText);
      },
      onerror: (response) => {
        rej(new Error(`Request failed with status ${response.status}`));
      },
    });
  });

  return JSON.parse(responseText) as CurrencyRates<B, C>;
}

const currencyLookup: Map<string, number> = new Map();

export async function getCurrencyRate(
  base: CurrencyCode,
  converted: CurrencyCode,
  date: FetchCurrencyDate,
): Promise<number> {
  if (!base) throw Error("Supplied an empty string as the base currency.");
  if (!converted)
    throw Error("Supplied an empty string as the converted currency.");
  if (base === converted) return 1.0;

  const key = `-${date.day}-${date.month}-${date.year}-${base}-${converted}`;
  const found = currencyLookup.get(key);
  if (found !== undefined) return found;
  const fetched = await fetchCurrency(base, converted, date);
  currencyLookup.set(key, fetched.rates[converted]);
  return fetched.rates[converted];
}
