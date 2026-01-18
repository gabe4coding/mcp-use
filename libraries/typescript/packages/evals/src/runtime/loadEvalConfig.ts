import fs from "node:fs/promises";
import path from "node:path";
import { EvalConfigSchema, type EvalConfig } from "./config.js";
import { EvalConfigError } from "../shared/errors.js";

let cachedConfig: { path: string; config: EvalConfig } | null = null;

export async function loadEvalConfig(
  configPath = "./eval.config.json"
): Promise<EvalConfig> {
  const resolvedPath = path.resolve(configPath);
  if (cachedConfig?.path === resolvedPath) {
    return cachedConfig.config;
  }

  let raw: string;
  try {
    raw = await fs.readFile(resolvedPath, "utf-8");
  } catch (error) {
    throw new EvalConfigError(
      `Eval config not found or unreadable: ${resolvedPath}`,
      error
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new EvalConfigError(
      `Eval config is not valid JSON: ${resolvedPath}`,
      error
    );
  }

  const result = EvalConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new EvalConfigError(
      `Eval config failed validation: ${result.error.message}`
    );
  }

  cachedConfig = { path: resolvedPath, config: result.data };
  return result.data;
}

export function clearEvalConfigCache(): void {
  cachedConfig = null;
}
