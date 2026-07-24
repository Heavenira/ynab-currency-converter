interface Console {
  /** Debug logger for this extension, prefixed so it's easy to filter in devtools. */
  ynab: (...args: unknown[]) => void;
}
