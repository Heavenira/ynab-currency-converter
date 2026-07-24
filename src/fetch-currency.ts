import { CurrencyCode } from "./types/ynab";

type FetchCurrencyDate = {
  day: string;
  month: string;
  year: string;
};

type CurrencyRates<C extends CurrencyCode> = {
  amount: number;
  base: CurrencyCode;
  date: string;
  rates: Record<C, number>;
};

export async function fetchCurrency<C extends CurrencyCode>(
  base: CurrencyCode,
  symbols: C,
  date: FetchCurrencyDate,
): Promise<CurrencyRates<C>> {
  const formattedDate = `${date.year}-${date.month.padStart(2, "0")}-${date.day.padStart(2, "0")}`;
  const url = `https://api.frankfurter.dev/v1/${formattedDate}?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(symbols)}`;

  const responseText = await new Promise<string>((res, rej) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      onload: (response) => {
        if (response.status < 200 || response.status >= 300) {
          rej(new Error(`Request failed with status ${response.status}`));
          return;
        }
        res(response.responseText);
      },
      onerror: (response) => {
        rej(new Error(`Request failed with status ${response.status}`));
      },
    });
  });

  return JSON.parse(responseText) as CurrencyRates<C>;
}
