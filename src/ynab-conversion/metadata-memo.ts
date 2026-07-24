import { parseCurrency } from "./currency";
import { parseDate } from "./date";

const METADATA_MEMO_KEY = "DATA";
const VALUE1_KEY = "X";
const HASH1_KEY = "x";
const VALUE2_KEY = "Y";
const HASH2_KEY = "y";

const INNER_KEYS = [VALUE1_KEY, HASH1_KEY, VALUE2_KEY, HASH2_KEY];

type MetadataMemoStruct = {
  /** Denotes that this is a metadata object. */
  [METADATA_MEMO_KEY]: {
    /** The first value in its foreign currency. */
    [VALUE1_KEY]: number;
    /** The hash account ID of the first value. */
    [HASH1_KEY]: string;
    /** The second value in its foreign currency. */
    [VALUE2_KEY]?: number;
    /** The hash account ID of the second value. */
    [HASH2_KEY]?: string;
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
  if (keysInner.length < 2) return false;

  for (const key of keysInner) {
    if (!INNER_KEYS.includes(key)) return false;
  }

  if (typeof objectInner[VALUE1_KEY] !== "number") return false;
  if (
    objectInner[VALUE2_KEY] !== undefined &&
    typeof objectInner[VALUE2_KEY] !== "number"
  )
    return false;
  if (typeof objectInner[HASH1_KEY] !== "string") return false;
  if (
    objectInner[HASH2_KEY] !== undefined &&
    typeof objectInner[HASH2_KEY] !== "string"
  )
    return false;

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

  /** The date of this transaction. */
  date;
  /** The inflow of this transaction. */
  inflow;
  /** The outflow of this transaction. */
  outflow;
  /** The YNAB row ID used to point to this row. */
  rowId: string;

  /**
   * Creates a metadata object
   */
  constructor(input: {
    date: string;
    memo: string;
    inflow: string;
    outflow: string;
    rowId: string;
  }) {
    this.date = parseDate(input.date);
    this.memo = input.memo;
    this.inflow = parseCurrency(input.inflow);
    this.outflow = parseCurrency(input.outflow);
    this.rowId = input.rowId;
    this.indexStart = -1;
    this.indexEnd = -1;

    let temp: MetadataMemoStruct | undefined = undefined;

    try {
      // Now let's identify the metadata JSON that exists in this row.
      const match = this.memo.match('{"' + METADATA_MEMO_KEY + '":');
      if (match) {
        this.indexStart = match.index!;
        this.indexEnd = findObjectEnd(this.memo, this.indexStart);
        if (this.indexStart < 0 || this.indexEnd < 0) {
          // This will intentionally error, and provide helpful info.
          temp = JSON.parse(this.memo.slice(this.indexStart));
        } else {
          temp = JSON.parse(
            this.memo.slice(this.indexStart, this.indexEnd + 1),
          );
        }
      }

      if (isValidMetadataMemo(temp)) {
        this.metadata = temp;
        return;
      }
    } catch (error) {
      console.ynab("Failed to parse memo.", { memo: this.memo, error });
    }

    // If we failed to parse metadata, we must start anew.
    this.metadata = {
      [METADATA_MEMO_KEY]: {
        [VALUE1_KEY]: -1,
        [HASH1_KEY]: "",
      },
    };
  }

  stringify() {
    return JSON.stringify(this.metadata, null, 0);
  }

  get value1(): number {
    return this.metadata[METADATA_MEMO_KEY][VALUE1_KEY];
  }
  set value1(amount: number) {
    this.metadata[METADATA_MEMO_KEY][VALUE1_KEY] = amount;
  }

  get value2(): number | undefined {
    return this.metadata[METADATA_MEMO_KEY][VALUE2_KEY];
  }
  set value2(amount: number) {
    this.metadata[METADATA_MEMO_KEY][VALUE2_KEY] = amount;
  }

  get hash1(): string {
    return this.metadata[METADATA_MEMO_KEY][HASH1_KEY];
  }
  set hash1(hash: string) {
    this.metadata[METADATA_MEMO_KEY][HASH1_KEY] = hash;
  }

  get hash2(): string | undefined {
    return this.metadata[METADATA_MEMO_KEY][HASH2_KEY];
  }
  set hash2(hash: string) {
    this.metadata[METADATA_MEMO_KEY][HASH2_KEY] = hash;
  }
}
