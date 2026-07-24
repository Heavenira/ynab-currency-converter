import { observerBody } from "./ynab";

observerBody.observe(document.body, {
  childList: true,
});
