// =============================================================
// ReleaseGuard AI — Built with IBM Bob
// © IBM Bob | ibm.com/products/watsonx
// =============================================================


export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001";

function getRequestInput(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof window === "undefined") return input;

  const hostname = window.location.hostname;
  const isReleaseGuardPagesHost =
    hostname === "releaseguard-ai.pages.dev" || hostname.endsWith(".releaseguard-ai.pages.dev");
  if (!isReleaseGuardPagesHost) return input;

  const inputUrl = input instanceof Request ? input.url : input.toString();
  const url = new URL(inputUrl, window.location.href);
  if (url.origin === window.location.origin) return input;

  return new URL(`${url.pathname}${url.search}${url.hash}`, window.location.origin);
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const response = await fetch(getRequestInput(input), { ...init, credentials: "include" });
  if (response.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.dispatchEvent(new Event("releaseguard:unauthorized"));
  }
  return response;
}
