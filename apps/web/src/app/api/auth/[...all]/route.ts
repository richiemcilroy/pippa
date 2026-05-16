import { getAuth } from "@/lib/auth";
import { corsOptionsResponse, withCors } from "@/lib/api-cors";
import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = (request: Request) => getAuth().handler(request);

const authHandlers = toNextJsHandler(handler);

export async function GET(request: Request) {
  return withCors(request, await authHandlers.GET(request));
}

export async function POST(request: Request) {
  return withCors(request, await authHandlers.POST(request));
}

export function OPTIONS(request: Request) {
  return corsOptionsResponse(request);
}
