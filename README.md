# ynab-currencies
This gives YNAB the ability to seamlessly display multiple currencies.

Please install this as a [Tampermonkey](https://www.tampermonkey.net/) extension.

This is written in vanilla TypeScript. Install the prerequisites by running:
```
npm install
```

Then to build the userscript run:
```
npm run build
```

You'll find the output in `dist/ynab-currency-converter.user.js`.

# Set your own currency!
NOTE: As of writing this, I've set the default currency to Canadian dollars. Right now I don't have the time to detect your YNAB budget's current currency.

```ts
// src/ynab-conversion/accounts.ts
export const defaultCurrency: AccountCurrency = {
  code: "CAD",
  symbol: "$",
  readable: "$CAD",
};
```

Overwrite this to the correct currency and it should be good.
