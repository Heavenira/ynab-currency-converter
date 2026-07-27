import css from "./styles.css";
import { observerBody } from "./ynab";

GM_addStyle(css);

observerBody.observe(document.body, {
  childList: true,
});
