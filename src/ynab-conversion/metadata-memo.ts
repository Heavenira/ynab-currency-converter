import { parseCurrency } from "./currency";
import { parseDate } from "./date";

export const REGEX_INFLOW =
  /\[(?:inflow)(?::?\s*|\s*=\s*)(\d+(?:\.\d+)?)(?:\s*@\s*(\d+(?:\.\d+)?))?\]/i;
export const REGEX_OUTFLOW =
  /\[(?:outflow)(?::?\s*|\s*=\s*)(\d+(?:\.\d+)?)(?:\s*@\s*(\d+(?:\.\d+)?))?\]/i;

function applyFlowMatch(memo: string, regex: RegExp, flow: FlowMetadata): void {
  const match = memo.match(regex);
  if (!match) return;

  flow.bankValue = parseFloat(match[1]);
  if (match[2]) {
    flow.driftPercent = parseFloat(match[2]);
  }
}

function formatFlow(
  label: string,
  output: string,
  regex: RegExp,
  flow: FlowMetadata,
): string {
  if (flow.bankValue === undefined) return output;

  const flowRounded = parseFloat(flow.bankValue.toFixed(5));
  const driftRounded =
    flow.driftPercent !== undefined
      ? parseFloat(flow.driftPercent.toFixed(5))
      : undefined;
  const drift = driftRounded !== undefined ? `@${driftRounded}` : "";
  const formatted = `[${label} ${flowRounded}${drift}]`;

  if (regex.test(output)) {
    return output.replace(regex, formatted);
  }
  return output.trimEnd() + ` ${formatted}`;
}

interface FlowMetadata {
  /** The number reported directly by YNAB. */
  ynab: number;
  /**
   * The number that is reported on the bank account in
   * the foreign currency. Lives inside of the memo.
   */
  bankValue?: number;
  /**
   * Nudges the conversion back to stability.
   * (ie. if a transaction took many days to clear, or
   * you are unhappy with what the API expresses, this
   * allows you to bring it back to normal)
   * @example 1.025
   */
  driftPercent?: number;
}

export class Metadata {
  /** Pointer to the original memo used to initialize this metadata. */
  private memo: string;

  /** The date of this transaction. */
  date;

  /** The inflow of this transaction. */
  inflow: FlowMetadata;
  /** The outflow of this transaction. */
  outflow: FlowMetadata;

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
    this.inflow = {
      ynab: parseCurrency(input.inflow),
    };
    this.outflow = {
      ynab: parseCurrency(input.outflow),
    };
    this.rowId = input.rowId;

    applyFlowMatch(this.memo, REGEX_INFLOW, this.inflow);
    applyFlowMatch(this.memo, REGEX_OUTFLOW, this.outflow);
  }

  stringify() {
    let output = this.memo;
    output = formatFlow("Inflow", output, REGEX_INFLOW, this.inflow);
    output = formatFlow("Outflow", output, REGEX_OUTFLOW, this.outflow);
    return output;
  }
}
