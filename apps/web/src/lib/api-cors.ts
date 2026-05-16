const localOrigins = new Set([
  "http://localhost:3030",
  "http://127.0.0.1:3030",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
]);

export function buildCorsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Expose-Headers": "set-auth-token",
    "Access-Control-Max-Age": "86400",
  });

  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }

  return headers;
}

export function corsOptionsResponse(request: Request) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

export function withCors(request: Request, response: Response) {
  const headers = new Headers(response.headers);

  for (const [key, value] of buildCorsHeaders(request)) {
    if (key.toLowerCase() === "vary" && headers.has("vary")) {
      headers.set("vary", mergeVary(headers.get("vary"), value));
      continue;
    }

    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isAllowedOrigin(origin: string) {
  if (localOrigins.has(origin)) {
    return true;
  }

  try {
    const { hostname, protocol } = new URL(origin);
    return (
      protocol === "https:" &&
      (hostname === "pippa.health" || hostname.endsWith(".pippa.health") || hostname.endsWith(".vercel.app"))
    );
  } catch {
    return false;
  }
}

function mergeVary(current: string | null, next: string) {
  const values = new Set(
    `${current ?? ""},${next}`
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  return Array.from(values).join(", ");
}
