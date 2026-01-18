export type ToolCallOutput =
  | { kind: "json"; value: unknown }
  | { kind: "text"; value: string };

export type ToolCallError =
  | { kind: "json"; value: unknown }
  | { kind: "text"; value: string };

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  output?: ToolCallOutput;
  error?: ToolCallError;
  durationMs: number;
  startedAt: number;
}

export interface ResourceAccess {
  name: string;
  uri: string;
  data?: unknown;
  accessedAt: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface EvalResult {
  input: string;
  output: string;
  toolCalls: ToolCall[];
  resourceAccess: ResourceAccess[];
  usage: TokenUsage;
  durationMs: number;
  error?: { code: string; message: string; [key: string]: unknown };
  followUp(prompt: string): Promise<EvalResult>;
}

export interface EvalAgent {
  run(
    prompt: string,
    options?: { timeout?: number }
  ): Promise<EvalResult>;
  cleanup(): Promise<void>;
}
