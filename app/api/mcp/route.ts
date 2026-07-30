import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { createMcpServer } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
/** Typesetting a long document takes noticeably longer than a page render. */
export const maxDuration = 60;

function unauthorised(status: number, error: string): Response {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32001, message: error }, id: null },
    {
      status,
      headers:
        status === 401
          ? { "www-authenticate": 'Bearer realm="lesueur-toolkit"' }
          : {},
    },
  );
}

/**
 * Stateless MCP over streamable HTTP. Serverless invocations don't share
 * memory, so a per-request server and transport is the only correct shape —
 * a session held in one instance would be missing from the next.
 */
async function handle(request: Request): Promise<Response> {
  const auth = authenticateMcpRequest(request);
  if (!auth.ok) return unauthorised(auth.status, auth.error);

  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } finally {
    await transport.close();
    await server.close();
  }
}

export function POST(request: Request): Promise<Response> {
  return handle(request);
}

export function GET(request: Request): Promise<Response> {
  return handle(request);
}

export function DELETE(request: Request): Promise<Response> {
  return handle(request);
}
