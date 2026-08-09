interface Window {
  ynab?: {
    formatDate: (argument: -400000000) => string;
    formatCurrency: (value: 123456780) => string;
  };
}

declare const unsafeWindow: Window & typeof globalThis;
