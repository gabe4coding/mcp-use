import type { BaseMessage } from "mcp-use";
import type { MCPAgent } from "mcp-use";
import type { MCPClient } from "mcp-use";
import { attachToolResults } from "./toolResultCapture.js";
import { attachResourceTracking } from "./resourceTracking.js";
import type { EvalResult, ToolCall, TokenUsage } from "./types.js";

interface EvalAgentOptions {
  serverLifecycle: "suite" | "test";
  usage: TokenUsage;
}

function isAIMessage(message: BaseMessage): boolean {
  const msg = message as BaseMessage & {
    type?: string;
    _getType?: () => string;
  };
  if (typeof msg._getType === "function") {
    return msg._getType() === "ai";
  }
  return msg.type === "ai";
}

function messageToString(message: BaseMessage): string {
  const content = (message as BaseMessage & { content?: unknown }).content;
  if (typeof content === "string") return content;
  try {
    return JSON.stringify(content);
  } catch {
    return String(content ?? "");
  }
}

export class EvalAgent {
  private agent: MCPAgent;
  private client: MCPClient;
  private serverLifecycle: "suite" | "test";
  private resourceAccessLog: EvalResult["resourceAccess"] = [];
  private usage: TokenUsage;

  constructor(agent: MCPAgent, client: MCPClient, options: EvalAgentOptions) {
    this.agent = agent;
    this.client = client;
    this.serverLifecycle = options.serverLifecycle;
    this.usage = options.usage;
    attachResourceTracking(
      this.client.getAllActiveSessions(),
      this.resourceAccessLog
    );
  }

  async run(
    prompt: string,
    options: { timeout?: number } = {}
  ): Promise<EvalResult> {
    return this.runInternal(prompt, options, false);
  }

  private async runInternal(
    prompt: string,
    options: { timeout?: number },
    isFollowUp: boolean
  ): Promise<EvalResult> {
    const toolCalls: ToolCall[] = [];
    const startTime = Date.now();
    const usageBefore = { ...this.usage };
    const historyBefore = this.agent.getConversationHistory().length;
    let error: EvalResult["error"] | undefined;

    if (this.serverLifecycle === "test" && !isFollowUp) {
      await this.client.closeAllSessions();
      await this.client.createAllSessions();
      attachResourceTracking(
        this.client.getAllActiveSessions(),
        this.resourceAccessLog
      );
    }

    try {
      const stream = this.agent.stream({
        prompt,
        signal: options.timeout
          ? AbortSignal.timeout(options.timeout)
          : undefined,
      });

      for await (const step of stream) {
        if (step.action?.tool) {
          toolCalls.push({
            name: step.action.tool,
            input: step.action.toolInput ?? {},
            startedAt: Date.now(),
            durationMs: 0,
          });
        }
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      error = {
        code: caught instanceof Error ? caught.name : "UNKNOWN",
        message,
      };
    }

    const history = this.agent.getConversationHistory();
    const newMessages = history.slice(historyBefore);
    attachToolResults(toolCalls, newMessages);

    const lastAi = [...newMessages].reverse().find(isAIMessage);
    const output = lastAi ? messageToString(lastAi) : "";

    const usageDelta = {
      inputTokens: Math.max(
        0,
        this.usage.inputTokens - usageBefore.inputTokens
      ),
      outputTokens: Math.max(
        0,
        this.usage.outputTokens - usageBefore.outputTokens
      ),
      totalTokens: Math.max(
        0,
        this.usage.totalTokens - usageBefore.totalTokens
      ),
    };

    const result: EvalResult = {
      input: prompt,
      output,
      toolCalls,
      resourceAccess: [...this.resourceAccessLog],
      usage: usageDelta,
      durationMs: Date.now() - startTime,
      error,
      followUp: (nextPrompt: string) =>
        this.runInternal(nextPrompt, options, true),
    };

    this.resourceAccessLog = [];
    return result;
  }

  async cleanup(): Promise<void> {
    await this.agent.close();
  }
}
