interface PagesFunctionContext {
  request: Request;
}

const BACKEND_ORIGIN = "https://ops-pilot1-1.onrender.com";

export async function onRequest({ request }: PagesFunctionContext): Promise<Response> {
  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, BACKEND_ORIGIN);
  const upstreamResponse = await fetch(new Request(upstreamUrl, request));
  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete("access-control-allow-origin");
  responseHeaders.delete("access-control-allow-credentials");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}
