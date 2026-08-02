const HOVER_DELAY_MS = 1000;

const SELECTOR_TOAST = "ynab-cc-toast";

/**
 * Toasts a message onto the screen given a DOM location.
 * @param message
 * @param location
 * @returns The toast element, so it can be dismissed later.
 */
function renderToast(message: string, location: DOMRect) {
  dismissToast();

  const tooltipDOM =
    document.querySelector<HTMLDivElement>("div.tooltip-global");

  if (!tooltipDOM) throw Error("Missing tooltip DOM from page.");

  const child = document.createElement("span");
  child.textContent = message;

  child.role = "tooltip";
  child.classList.add("tooltip-content", "tooltip-visible", SELECTOR_TOAST);
  child.style.top = `calc(${location.bottom}px + 1.0rem)`;
  child.style.left = `${location.left + location.width / 2}px`;
  child.style.transform = "translateX(-50%)";
  tooltipDOM.insertAdjacentElement("beforeend", child);
  return child;
}

type ToastState = {
  hoverTimeout: ReturnType<typeof setTimeout> | undefined;
  toastDOM: HTMLElement | undefined;
};

/** Tracks every pending/shown toast, so they can all be dismissed at once. */
const toastStates = new Set<ToastState>();

/** Binds hover listeners to `target` so it toasts its own text after being hovered for a while. */
export function registerToast(target: HTMLElement, message: string) {
  if (target.dataset.ynabCcHoverBound) return;
  target.dataset.ynabCcHoverBound = "true";

  const state: ToastState = { hoverTimeout: undefined, toastDOM: undefined };
  toastStates.add(state);

  target.addEventListener("mouseenter", () => {
    const hoverTimeout = setTimeout(() => {
      state.hoverTimeout = undefined;
      state.toastDOM = renderToast(message, target.getBoundingClientRect());
    }, HOVER_DELAY_MS);
    state.hoverTimeout = hoverTimeout;
  });

  target.addEventListener("mouseleave", () => {
    dismissToast();
  });
}

/** Cancels every pending toast timeout, and removes every shown toast. */
export function dismissToast() {
  for (const dom of document.querySelectorAll(`.${SELECTOR_TOAST}`)) {
    dom.remove();
  }
  for (const state of toastStates) {
    clearTimeout(state.hoverTimeout);
    state.toastDOM?.remove();
  }
  toastStates.clear();
}
