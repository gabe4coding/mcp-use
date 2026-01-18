import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { TokenUsage } from "./types.js";

export type TokenUsageSnapshot = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export function extractTokenUsage(output: any): TokenUsageSnapshot | null {
  const usage =
    output?.llmOutput?.tokenUsage ||
    output?.llmOutput?.usage ||
    output?.generations?.[0]?.[0]?.generationInfo?.usage;

  if (!usage) return null;

  return {
    inputTokens: usage.promptTokens ?? usage.input_tokens ?? 0,
    outputTokens: usage.completionTokens ?? usage.output_tokens ?? 0,
    totalTokens: usage.totalTokens ?? usage.total_tokens ?? 0,
  };
}

export class TokenTrackingCallback extends BaseCallbackHandler {
  name = "token_tracking";
  private usage: TokenUsage;

  constructor(usage: TokenUsage) {
    super();
    this.usage = usage;
  }

  async handleLLMEnd(output: any) {
    const snapshot = extractTokenUsage(output);
    if (!snapshot) return;

    this.usage.inputTokens += snapshot.inputTokens;
    this.usage.outputTokens += snapshot.outputTokens;
    this.usage.totalTokens += snapshot.totalTokens;
  }
}
