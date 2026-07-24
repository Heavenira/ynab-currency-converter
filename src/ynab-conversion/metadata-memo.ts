const METADATA_MEMO_KEY = "memo";
const FOREIGN_AMOUNT_KEY = "fa";

type MetadataMemoStruct = {
  /** Denotes that this is a metadata object. */
  [METADATA_MEMO_KEY]: {
    /** The amount to display of the foreign currency. */
    [FOREIGN_AMOUNT_KEY]: number;
  };
};

function isValidMetadataMemo(
  metadata: unknown,
): metadata is MetadataMemoStruct {
  if (typeof metadata !== "object" || metadata === null) return false;
  const keysMain = Object.keys(metadata);
  if (keysMain.length !== 1) return false;
  const keyMain = keysMain[0];
  if (keyMain !== METADATA_MEMO_KEY) return false;

  const objectInner = metadata[keyMain as keyof object];
  if (typeof objectInner !== "object" || objectInner === null) return false;
  const keysInner = Object.keys(objectInner);
  if (keysInner.length !== 1) return false;
  if (!keysInner.includes(FOREIGN_AMOUNT_KEY)) return false;
  const foreignAmount = objectInner[FOREIGN_AMOUNT_KEY];
  if (typeof foreignAmount !== "number") return false;
  return true;
}

/**
 * Scans `text` starting at the opening `{` located at `indexStart` and
 * returns the index just past its matching closing `}`, honoring nested
 * braces and quoted strings (so braces inside string values don't confuse it).
 * Returns -1 if the object is never closed.
 */
function findObjectEnd(text: string, indexStart: number): number {
  let depth = 0;
  let quote: string | null = null;

  for (let i = indexStart; i < text.length; i++) {
    const char = text[i];

    if (quote) {
      if (char === "\\") i++;
      else if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'") quote = char;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }

  return -1;
}

export class Metadata {
  /** The structured object of the metadata. */
  private metadata: MetadataMemoStruct;
  /** Pointer to the original memo used to initialize this metadata. */
  private memo: string;
  /** The starting index of the `{` character that begins the JSON. */
  private indexStart: number;
  /** The ending index of the `}` character that ends the JSON. */
  private indexEnd: number;

  /**
   * Creates a metadata object
   */
  constructor(memo: string) {
    this.memo = memo;
    this.indexStart = -1;
    this.indexEnd = -1;
    let temp: MetadataMemoStruct | undefined = undefined;

    try {
      // Now let's identify the metadata that exists in this column.
      const match = memo.match(METADATA_MEMO_KEY);
      if (match) {
        // The `{` character starts two units before the match start.
        this.indexStart = match.index! - 2;
        this.indexEnd = findObjectEnd(memo, this.indexStart);
        if (this.indexStart < 0 || this.indexEnd < 0) {
          // This will intentionally error, and provide helpful info.
          temp = JSON.parse(memo.slice(this.indexStart));
        } else {
          temp = JSON.parse(memo.slice(this.indexStart, this.indexEnd + 1));
        }
      }

      if (isValidMetadataMemo(temp)) {
        this.metadata = temp;
        return;
      }
    } catch (error) {
      console.ynab("Failed to parse memo.", { memo, error });
    }

    // If we failed to parse metadata, we must start anew.
    this.metadata = {
      [METADATA_MEMO_KEY]: {
        [FOREIGN_AMOUNT_KEY]: -1,
      },
    };
  }

  stringify() {
    return JSON.stringify(this.metadata, null, 0);
  }

  get foreignAmount() {
    return this.metadata[METADATA_MEMO_KEY][FOREIGN_AMOUNT_KEY];
  }

  set foreignAmount(amount: number) {
    this.metadata[METADATA_MEMO_KEY][FOREIGN_AMOUNT_KEY] = amount;
  }
}
