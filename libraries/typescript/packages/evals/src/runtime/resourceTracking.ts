import type { MCPSession } from "mcp-use";
import type { ResourceAccess } from "./types.js";

const wrappedSessions = new WeakSet<MCPSession>();

function extractResourceName(uri: string): string {
  const trimmed = uri.replace(/[#?].*$/, "");
  const parts = trimmed.split("/");
  return parts[parts.length - 1] || uri;
}

export function attachResourceTracking(
  sessions: Record<string, MCPSession>,
  log: ResourceAccess[]
): void {
  for (const session of Object.values(sessions)) {
    if (wrappedSessions.has(session)) continue;
    wrappedSessions.add(session);

    const originalRead = session.readResource.bind(session);
    session.readResource = async (uri: string, options?: unknown) => {
      const result = await originalRead(uri, options as any);
      log.push({
        name: extractResourceName(uri),
        uri,
        data: result,
        accessedAt: Date.now(),
      });
      return result;
    };
  }
}
