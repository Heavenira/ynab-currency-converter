import { accounts, parseDate } from "./ynab-conversion";
import { analyzeRow, AnalysisResult } from "./analyze-row";
import { renderMetadata } from "./render-row";
import { renderButton, RenderButtonPointers } from "./render-button";
import { isHTMLDiv } from "./helpers";

function queryGridBody1(node: Node) {
  if (
    isHTMLDiv(node) &&
    node.classList.contains("layout") &&
    node.classList.length === 1
  ) {
    const gridBody1 = node.querySelector<HTMLDivElement>("div.ynab-grid");
    if (gridBody1) {
      console.log("Observing grid body 1", gridBody1);
      observerGridBody1.observe(gridBody1, {
        childList: true,
      });
    }
    return gridBody1;
  }
  return null;
}

function queryGridBody2(gridBody1: HTMLDivElement) {
  const gridBody2 = gridBody1.querySelector<HTMLDivElement>(
    ":scope > div.ynab-grid-container > div.ynab-grid-body",
  );
  if (!gridBody2) {
    throw Error("Fatal error: getGridBody2 did not provide an exact match.");
  }
  console.log("Observing grid body 2", gridBody2);
  observerGridBody2.observe(gridBody2, {
    childList: true,
  });
  return gridBody2;
}

/** Observer meant to be executed as soon as `document.body` exists. */
export const observerBody = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      /** The grid body, containing all the transaction entries. */
      const gridBody1 = queryGridBody1(node);

      if (!gridBody1) continue;

      const gridBody2 = queryGridBody2(gridBody1);

      // Handles rows that already exist before the observer attaches.
      setTimeout(() => {
        const rows = gridBody2.querySelectorAll<HTMLDivElement>(
          ":scope > div.ynab-grid-body-row[data-row-id]",
        );
        for (const row of rows) {
          const { metadata } = analyzeRow(row);
          if (!metadata) return;
          renderMetadata(metadata, true);
        }
      }, 1);
    }
  }
});

const observerGridBody1 = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!isHTMLDiv(node)) continue;
      queryGridBody2(node);
    }
  }
});

/** Observer meant to be executed as soon as the transaction grid is realized. */
const observerGridBody2 = new MutationObserver((mutations) => {
  const printiable: Node[] = [];
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!isHTMLDiv(node)) continue;
      printiable.push(node);
    }
  }
  let account = accounts.getCurrent();

  const pointers: Partial<RenderButtonPointers> = {};

  const keysPointer: (keyof RenderButtonPointers)[] = [
    "cancelButton",
    "date",
    "memo",
    "inflow",
    "outflow",
  ];

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!isHTMLDiv(node)) continue;

      const analysis = analyzeRow(node);

      if (analysis.inputCells) {
        const selectInput = (selector: string) =>
          analysis.inputCells?.find((x) => x.closest(selector));

        // If there is no current account, we can locate it via the input cells
        if (!account) {
          const input = selectInput(".ynab-grid-cell-accountName");
          if (input) account = accounts.getName(input.value.trim());
        }

        if (!pointers.date) {
          const input = selectInput(".ynab-grid-cell-date");
          if (input) pointers.date = input;
        }

        if (!pointers.memo) {
          const input = selectInput(".ynab-grid-cell-memo");
          if (input) pointers.memo = input;
        }

        if (!pointers.inflow) {
          const input = selectInput(".ynab-grid-cell-inflow");
          if (input) pointers.inflow = input;
        }

        if (!pointers.outflow) {
          const input = selectInput(".ynab-grid-cell-outflow");
          if (input) pointers.outflow = input;
        }
      }
      if (analysis.buttonCancel) pointers.cancelButton = analysis.buttonCancel;
      if (analysis.metadata) {
        renderMetadata(analysis.metadata, true);
      }
    }
  }

  if (account && keysPointer.every((key) => pointers[key])) {
    renderButton(account, "", pointers as Required<typeof pointers>);
  }
});

observerBody.observe(document.body, {
  childList: true,
});
