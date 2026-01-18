import { expect } from "vitest";
import type { EvalResult, ToolCall, ToolCallError, ToolCallOutput } from "./types.js";

type MatcherResult = { pass: boolean; message: () => string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function partialMatch(actual: unknown, expected: unknown): boolean {
  if (expected === actual) return true;
  if (typeof expected !== "object" || expected === null) {
    return actual === expected;
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false;
    return expected.every((item, index) => partialMatch(actual[index], item));
  }

  if (!isRecord(actual) || !isRecord(expected)) return false;
  for (const [key, value] of Object.entries(expected)) {
    if (!(key in actual)) return false;
    if (!partialMatch(actual[key], value)) return false;
  }
  return true;
}

function describeToolCalls(toolCalls: ToolCall[]): string {
  if (!toolCalls.length) return "none";
  return toolCalls.map((call) => call.name).join(", ");
}

function matchOutput(
  output: ToolCallOutput | undefined,
  expected: Record<string, unknown> | string
): boolean {
  if (!output) return false;
  if (typeof expected === "string") {
    if (output.kind === "text") {
      return output.value.toLowerCase().includes(expected.toLowerCase());
    }
    if (typeof output.value === "string") {
      return output.value.toLowerCase().includes(expected.toLowerCase());
    }
    return JSON.stringify(output.value).toLowerCase().includes(expected.toLowerCase());
  }
  if (output.kind !== "json") return false;
  return partialMatch(output.value, expected);
}

function matchError(
  error: ToolCallError | undefined,
  expected: Record<string, unknown> | string
): boolean {
  if (!error) return false;
  if (typeof expected === "string") {
    if (error.kind === "text") {
      return error.value.toLowerCase().includes(expected.toLowerCase());
    }
    if (typeof error.value === "string") {
      return error.value.toLowerCase().includes(expected.toLowerCase());
    }
    return JSON.stringify(error.value).toLowerCase().includes(expected.toLowerCase());
  }
  if (error.kind !== "json") return false;
  return partialMatch(error.value, expected);
}

expect.extend({
  toHaveUsedTool(received: EvalResult, toolName: string): MatcherResult {
    const used = received.toolCalls.some((tc) => tc.name === toolName);
    return {
      pass: used,
      message: () =>
        used
          ? `Expected not to have used tool "${toolName}"`
          : `Expected to have used tool "${toolName}", but it was not called. Tools used: ${describeToolCalls(received.toolCalls)}`,
    };
  },

  toHaveToolCallCount(received: EvalResult, count: number): MatcherResult {
    const actual = received.toolCalls.length;
    return {
      pass: actual === count,
      message: () => `Expected ${count} tool calls, but got ${actual}`,
    };
  },

  toHaveToolCallWith(
    received: EvalResult,
    toolName: string,
    partialInput: Record<string, unknown>
  ): MatcherResult {
    const toolCall = received.toolCalls.find((tc) => tc.name === toolName);
    if (!toolCall) {
      return { pass: false, message: () => `Tool "${toolName}" was not called` };
    }
    const matches = partialMatch(toolCall.input, partialInput);
    return {
      pass: matches,
      message: () =>
        matches
          ? `Expected tool "${toolName}" not to be called with ${JSON.stringify(partialInput)}`
          : `Expected tool "${toolName}" to be called with ${JSON.stringify(partialInput)}, but got ${JSON.stringify(toolCall.input)}`,
    };
  },

  toHaveToolCallResult(
    received: EvalResult,
    toolName: string,
    partialResult: Record<string, unknown> | string
  ): MatcherResult {
    const toolCall = received.toolCalls.find((tc) => tc.name === toolName);
    if (!toolCall) {
      return { pass: false, message: () => `Tool "${toolName}" was not called` };
    }
    const matches = matchOutput(toolCall.output, partialResult);
    return {
      pass: matches,
      message: () =>
        matches
          ? `Expected tool "${toolName}" result not to match ${JSON.stringify(partialResult)}`
          : `Expected tool "${toolName}" result to match ${JSON.stringify(partialResult)}, but got ${JSON.stringify(toolCall.output)}`,
    };
  },

  toHaveCalledToolsInOrder(
    received: EvalResult,
    toolNames: string[]
  ): MatcherResult {
    const actualNames = received.toolCalls.map((tc) => tc.name);
    let lastIndex = -1;
    for (const name of toolNames) {
      const index = actualNames.indexOf(name, lastIndex + 1);
      if (index === -1) {
        return {
          pass: false,
          message: () =>
            `Expected tools to be called in order ${JSON.stringify(toolNames)}, but got ${JSON.stringify(actualNames)}`,
        };
      }
      lastIndex = index;
    }
    return {
      pass: true,
      message: () =>
        `Expected tools not to be called in order ${JSON.stringify(toolNames)}`,
    };
  },

  toHaveUsedResource(received: EvalResult, resourceName: string): MatcherResult {
    const used = received.resourceAccess.some(
      (ra) => ra.name === resourceName || ra.uri.includes(resourceName)
    );
    return {
      pass: used,
      message: () =>
        used
          ? `Expected not to have accessed resource "${resourceName}"`
          : `Expected to have accessed resource "${resourceName}"`,
    };
  },

  toHaveOutputContaining(received: EvalResult, text: string): MatcherResult {
    const contains = received.output.toLowerCase().includes(text.toLowerCase());
    return {
      pass: contains,
      message: () =>
        contains
          ? `Expected output not to contain "${text}"`
          : `Expected output to contain "${text}"`,
    };
  },

  toHaveCompletedWithinMs(received: EvalResult, ms: number): MatcherResult {
    return {
      pass: received.durationMs <= ms,
      message: () =>
        `Expected completion within ${ms}ms, but took ${received.durationMs}ms`,
    };
  },

  toHaveUsedLessThanTokens(received: EvalResult, count: number): MatcherResult {
    return {
      pass: received.usage.totalTokens < count,
      message: () =>
        `Expected less than ${count} tokens, but used ${received.usage.totalTokens}`,
    };
  },

  toHaveFailed(received: EvalResult): MatcherResult {
    const failed = !!received.error;
    return {
      pass: failed,
      message: () =>
        failed
          ? `Expected not to have failed, but got: ${received.error?.message}`
          : "Expected to have failed, but succeeded",
    };
  },

  toHaveFailedWith(
    received: EvalResult,
    partialPayloadOrString: Record<string, unknown> | string
  ): MatcherResult {
    if (!received.error) {
      return { pass: false, message: () => "Expected to have failed, but succeeded" };
    }
    if (typeof partialPayloadOrString === "string") {
      const message = received.error.message ?? "";
      const contains = message
        .toLowerCase()
        .includes(partialPayloadOrString.toLowerCase());
      return {
        pass: contains,
        message: () =>
          `Expected error message to contain "${partialPayloadOrString}", but got "${message}"`,
      };
    }
    const matches = partialMatch(received.error, partialPayloadOrString);
    return {
      pass: matches,
      message: () =>
        `Expected error to match ${JSON.stringify(partialPayloadOrString)}, but got ${JSON.stringify(received.error)}`,
    };
  },

  toHaveToolCallFailed(received: EvalResult, toolName: string): MatcherResult {
    const toolCall = received.toolCalls.find((tc) => tc.name === toolName);
    if (!toolCall) {
      return { pass: false, message: () => `Tool "${toolName}" was not called` };
    }
    return {
      pass: !!toolCall.error,
      message: () =>
        toolCall.error
          ? `Expected tool "${toolName}" not to have failed`
          : `Expected tool "${toolName}" to have failed, but it succeeded`,
    };
  },

  toHaveToolCallFailedWith(
    received: EvalResult,
    toolName: string,
    partialPayloadOrString: Record<string, unknown> | string
  ): MatcherResult {
    const toolCall = received.toolCalls.find((tc) => tc.name === toolName);
    if (!toolCall) {
      return { pass: false, message: () => `Tool "${toolName}" was not called` };
    }
    const matches = matchError(toolCall.error, partialPayloadOrString);
    return {
      pass: matches,
      message: () =>
        matches
          ? `Expected tool "${toolName}" error not to match ${JSON.stringify(partialPayloadOrString)}`
          : `Expected tool "${toolName}" error to match ${JSON.stringify(partialPayloadOrString)}, but got ${JSON.stringify(toolCall.error)}`,
    };
  },
});

declare module "vitest" {
  interface Assertion<T = any> {
    toHaveUsedTool(toolName: string): T;
    toHaveToolCallCount(count: number): T;
    toHaveToolCallWith(toolName: string, partialInput: Record<string, unknown>): T;
    toHaveToolCallResult(toolName: string, partialResult: Record<string, unknown> | string): T;
    toHaveCalledToolsInOrder(toolNames: string[]): T;
    toHaveUsedResource(resourceName: string): T;
    toHaveOutputContaining(text: string): T;
    toHaveCompletedWithinMs(ms: number): T;
    toHaveUsedLessThanTokens(count: number): T;
    toHaveFailed(): T;
    toHaveFailedWith(partialPayloadOrString: Record<string, unknown> | string): T;
    toHaveToolCallFailed(toolName: string): T;
    toHaveToolCallFailedWith(
      toolName: string,
      partialPayloadOrString: Record<string, unknown> | string
    ): T;
  }
}
