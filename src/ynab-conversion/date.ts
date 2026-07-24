export type DateFormat =
  | "1969/12/31"
  | "1969-31-12"
  | "31-12-1969"
  | "31/12/1969"
  | "31.12.1969"
  | "12/31/1969"
  | "1969.12.31";

export interface DateStruct {
  day: string;
  month: string;
  year: string;
}

function getDateFormat() {
  const exampleDate = unsafeWindow.ynab?.formatDate(0) as
    DateFormat | undefined;
  if (!exampleDate) throw Error("Cannot acquire the date format.");
  return exampleDate;
}

/**
 * Takes in a date string and outputs its day, month, and year as an object.
 * @param date The stringified value from YNAB.
 */
export function parseDate(date: string): DateStruct {
  if (!date) throw Error("Failed to parse empty date.");

  const format = getDateFormat();

  switch (format) {
    case "31-12-1969":
    case "31.12.1969":
    case "31/12/1969":
      return {
        day: date.slice(0, 2),
        month: date.slice(3, 5),
        year: date.slice(6),
      };
    case "12/31/1969":
      return {
        month: date.slice(0, 2),
        day: date.slice(3, 5),
        year: date.slice(6),
      };
    case "1969-31-12":
      return {
        year: date.slice(0, 4),
        day: date.slice(5, 7),
        month: date.slice(8),
      };
    case "1969.12.31":
    case "1969/12/31":
      return {
        year: date.slice(0, 4),
        month: date.slice(5, 7),
        day: date.slice(8),
      };
  }
}
