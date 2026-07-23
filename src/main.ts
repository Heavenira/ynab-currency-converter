import { observerBody } from "./ynab";

console.log("Loaded UserScript! Proski");

observerBody.observe(document.body, {
  childList: true,
});
