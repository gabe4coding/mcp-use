import { z } from "zod";

export const AgentConfigSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  baseUrl: z.string().min(1).optional(),
});

export const EvalDefaultsSchema = z.object({
  timeout: z.number().int().nonnegative(),
  retries: z.number().int().nonnegative(),
  serverLifecycle: z.enum(["suite", "test"]),
  additionalInstructions: z.string().optional(),
});

export const EvalConfigSchema = z.object({
  default: z.object({
    runAgent: z.string().min(1),
    judgeAgent: z.string().min(1),
  }),
  agents: z.record(z.string(), AgentConfigSchema),
  servers: z.record(z.string(), z.unknown()),
  defaults: EvalDefaultsSchema,
});

export type EvalConfig = z.infer<typeof EvalConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type EvalDefaults = z.infer<typeof EvalDefaultsSchema>;
