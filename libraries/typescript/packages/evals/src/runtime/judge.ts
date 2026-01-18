import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { statSync } from "node:fs";
import { EvalConfigError } from "../shared/errors.js";
import { loadEvalConfig } from "./loadEvalConfig.js";

export interface JudgeResult {
  score: number;
  reasoning: string;
}

const JUDGE_SYSTEM_PROMPT = `
You are an evaluation judge comparing two pieces of text for semantic similarity.

Given:
1. ACTUAL: The text to evaluate
2. EXPECTED: The expected/reference text

Score the similarity from 0.0 to 1.0:
- 1.0: Perfect semantic match (same meaning, may differ in phrasing)
- 0.7-0.9: High similarity (core meaning matches, minor details differ)
- 0.4-0.6: Partial match (some overlap but significant differences)
- 0.1-0.3: Low similarity (tangentially related)
- 0.0: No similarity (completely different meaning)

Respond in JSON format:
{
  "score": <number between 0 and 1>,
  "reasoning": "<brief explanation>"
}
`;

let cachedModel: ChatOpenAI | ChatAnthropic | null = null;
let cachedConfigPath: string | null = null;
let cachedConfigMtime: number | null = null;

export function parseJudgeResponse(content: string): JudgeResult {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Judge did not return valid JSON");
  }
  const parsed = JSON.parse(match[0]);
  const score = Number(parsed.score);
  if (!Number.isFinite(score)) {
    throw new Error("Invalid judge score: must be a finite number");
  }
  return {
    score,
    reasoning: String(parsed.reasoning ?? ""),
  };
}

async function getJudgeModel(configPath?: string) {
  const resolvedPath = configPath ?? "";

  // Check if we have a valid cached model
  if (cachedModel && cachedConfigPath === resolvedPath) {
    // Check if config file has changed
    if (resolvedPath) {
      try {
        const stats = statSync(resolvedPath);
        const currentMtime = stats.mtimeMs;
        if (cachedConfigMtime !== null && cachedConfigMtime === currentMtime) {
          return cachedModel;
        }
      } catch {
        // File doesn't exist or can't be read, invalidate cache
        cachedModel = null;
        cachedConfigPath = null;
        cachedConfigMtime = null;
      }
    } else {
      // No config path specified, cache is still valid
      return cachedModel;
    }
  }

  const config = await loadEvalConfig(configPath);
  const judgeKey = config.default.judgeAgent;
  const agentConfig = config.agents[judgeKey];
  if (!agentConfig) {
    throw new EvalConfigError(`Judge agent "${judgeKey}" not found in config`);
  }

  // Double-check that path hasn't changed during async load
  if (cachedConfigPath === resolvedPath && cachedModel) {
    return cachedModel;
  }

  if (agentConfig.provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new EvalConfigError("OPENAI_API_KEY is required for judge");
    }
    cachedModel = new ChatOpenAI({
      model: agentConfig.model,
      openAIApiKey: apiKey,
      configuration: agentConfig.baseUrl
        ? { baseURL: agentConfig.baseUrl }
        : undefined,
      temperature: 0,
    });
  } else if (agentConfig.provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new EvalConfigError("ANTHROPIC_API_KEY is required for judge");
    }
    cachedModel = new ChatAnthropic({
      model: agentConfig.model,
      anthropicApiKey: apiKey,
      temperature: 0,
    });
  } else {
    throw new EvalConfigError(
      `Unsupported judge provider: ${agentConfig.provider}`
    );
  }

  cachedConfigPath = resolvedPath;

  // Store mtime for cache invalidation
  if (resolvedPath) {
    try {
      const stats = statSync(resolvedPath);
      cachedConfigMtime = stats.mtimeMs;
    } catch {
      cachedConfigMtime = null;
    }
  } else {
    cachedConfigMtime = null;
  }

  return cachedModel;
}

export async function judge(
  actual: string,
  expected: string,
  options: { configPath?: string } = {}
): Promise<JudgeResult> {
  const llm = await getJudgeModel(options.configPath);
  const response = await llm.invoke([
    { role: "system", content: JUDGE_SYSTEM_PROMPT },
    {
      role: "user",
      content: `ACTUAL:\n${actual}\n\nEXPECTED:\n${expected}`,
    },
  ]);

  return parseJudgeResponse(String(response.content ?? ""));
}
