import { MCPAgent, MCPClient } from "mcp-use";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { EvalConfigError } from "../shared/errors.js";
import { loadEvalConfig } from "./loadEvalConfig.js";
import { EvalAgent } from "./EvalAgent.js";
import type { AgentConfig, EvalConfig } from "./config.js";
import { TokenTrackingCallback } from "./tokenUsage.js";
import type { TokenUsage } from "./types.js";

export interface CreateEvalAgentOptions {
  runAgent?: string;
  judgeAgent?: string;
  servers?: string[];
  serverLifecycle?: "suite" | "test";
  configPath?: string;
}

function resolveAgentConfig(config: EvalConfig, key: string): AgentConfig {
  const agentConfig = config.agents[key];
  if (!agentConfig) {
    throw new EvalConfigError(`Agent "${key}" not found in eval config`);
  }
  return agentConfig;
}

function createModel(agentConfig: AgentConfig) {
  if (agentConfig.provider === "openai") {
    const apiKey =
      process.env.OPENAI_API_KEY || (agentConfig.baseUrl ? "local" : undefined);

    if (!apiKey) {
      throw new EvalConfigError(
        "OPENAI_API_KEY is required for OpenAI-compatible providers"
      );
    }

    return new ChatOpenAI({
      model: agentConfig.model,
      openAIApiKey: apiKey,
      configuration: agentConfig.baseUrl
        ? { baseURL: agentConfig.baseUrl }
        : undefined,
    });
  }

  if (agentConfig.provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new EvalConfigError(
        "ANTHROPIC_API_KEY is required for Anthropic providers"
      );
    }

    return new ChatAnthropic({
      model: agentConfig.model,
      anthropicApiKey: apiKey,
    });
  }

  throw new EvalConfigError(`Unsupported provider: ${agentConfig.provider}`);
}

export async function createEvalAgent(
  options: CreateEvalAgentOptions = {}
): Promise<EvalAgent> {
  const config = await loadEvalConfig(options.configPath);
  const runAgentKey = options.runAgent ?? config.default.runAgent;
  const runAgentConfig = resolveAgentConfig(config, runAgentKey);

  const llm = createModel(runAgentConfig);

  const serverKeys = options.servers ?? Object.keys(config.servers);
  const servers: Record<string, unknown> = {};
  for (const key of serverKeys) {
    const serverConfig = config.servers[key];
    if (!serverConfig) {
      throw new EvalConfigError(`Server "${key}" not found in eval config`);
    }
    servers[key] = serverConfig;
  }

  const client = new MCPClient({
    mcpServers: servers,
  });

  await client.createAllSessions();

  const usage: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  // Build agent options with optional additionalInstructions from config
  const agentOptions: any = {
    client,
    llm,
    maxSteps: 10,
    memoryEnabled: true,
    autoInitialize: true,
    callbacks: [new TokenTrackingCallback(usage)],
  };

  // Add additionalInstructions if provided in config
  if (config.defaults.additionalInstructions) {
    agentOptions.additionalInstructions =
      config.defaults.additionalInstructions;
  }

  const agent = new MCPAgent(agentOptions);

  return new EvalAgent(agent, client, {
    serverLifecycle: options.serverLifecycle ?? config.defaults.serverLifecycle,
    usage,
  });
}
