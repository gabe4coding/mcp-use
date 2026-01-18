import type { BaseMessage } from "mcp-use";
import type { ToolCall, ToolCallError, ToolCallOutput } from "./types.js";

function isToolMessage(message: BaseMessage): boolean {
  const msg = message as BaseMessage & {
    type?: string;
    tool_call_id?: string;
    _getType?: () => string;
  };
  if (typeof msg._getType === "function") {
    return msg._getType() === "tool";
  }
  return msg.type === "tool" || typeof msg.tool_call_id === "string";
}

function normalizeOutput(value: unknown): ToolCallOutput {
  if (typeof value === "string") {
    return { kind: "text", value };
  }
  return { kind: "json", value };
}

function normalizeError(value: unknown): ToolCallError {
  if (typeof value === "string") {
    return { kind: "text", value };
  }
  return { kind: "json", value };
}

function extractToolPayload(content: unknown): {
  output?: ToolCallOutput;
  error?: ToolCallError;
} {
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (/^error\b/i.test(trimmed)) {
      return { error: normalizeError(trimmed) };
    }
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object" && "error" in parsed) {
        return { error: normalizeError((parsed as { error: unknown }).error) };
      }
      return { output: normalizeOutput(parsed) };
    } catch {
      return { output: normalizeOutput(content) };
    }
  }

  if (content && typeof content === "object" && "error" in content) {
    return { error: normalizeError((content as { error: unknown }).error) };
  }

  return { output: normalizeOutput(content) };
}

export function attachToolResults(
  toolCalls: ToolCall[],
  messages: BaseMessage[]
): void {
  const toolMessages = messages.filter(isToolMessage);
  let cursor = 0;

  for (const message of toolMessages) {
    const toolCall = toolCalls[cursor];
    if (!toolCall) break;

    const payload = extractToolPayload((message as { content?: unknown }).content);
    toolCall.output = payload.output;
    toolCall.error = payload.error;
    toolCall.durationMs = Math.max(0, Date.now() - toolCall.startedAt);
    cursor += 1;
  }
}
