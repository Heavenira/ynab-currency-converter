/**
 * This is an example of what the format *should* output.
 * However I found that changing the timezone makes this unpredicatable.
 * So this type should be used as a reference, NOT as a direct equality.
 */
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
  const exampleDate = unsafeWindow.ynab?.formatDate(-400000000) as
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

  const delimeter = format.match(/[-./]/)![0] as "-" | "." | "/";

  const split = format.split(delimeter);

  let day: string;
  let month: string;
  let year: string;

  if (split[0].length === 4) {
    // The year is placed at the beginning of the string.
    year = date.slice(0, 4);
    if (split[1].startsWith("1")) {
      month = date.slice(5, 7);
      day = date.slice(8);
    } else {
      month = date.slice(8);
      day = date.slice(5, 7);
    }
  } else {
    // The year is placed at the end of the string.
    year = date.slice(6);
    if (split[0].startsWith("1")) {
      month = date.slice(0, 2);
      day = date.slice(3, 5);
    } else {
      month = date.slice(3, 5);
      day = date.slice(0, 2);
    }
  }

  return {
    day,
    month,
    year,
  };
}
