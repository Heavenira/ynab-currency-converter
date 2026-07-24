type GMXmlHttpRequestResponse = {
  status: number;
  statusText: string;
  responseText: string;
};

type GMXmlHttpRequestDetails = {
  method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD" | "OPTIONS";
  url: string;
  onload?: (response: GMXmlHttpRequestResponse) => void;
  onerror?: (response: GMXmlHttpRequestResponse) => void;
};

declare function GM_xmlhttpRequest(details: GMXmlHttpRequestDetails): void;
