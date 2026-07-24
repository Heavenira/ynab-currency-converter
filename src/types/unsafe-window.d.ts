interface Window {
  ynab?: {
    formatDate: (argument: 0) => string;
    formatCurrency: (value: 123456780) => string;
  };
}

declare const unsafeWindow: Window & typeof globalThis;
