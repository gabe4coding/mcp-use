import { z } from "zod";

export const ToolTestCaseSchema = z.object({
  category: z.enum(["direct", "indirect", "negative", "error"]),
  prompt: z.string().min(1),
  expectedToolCall: z
    .object({
      name: z.string().min(1),
      input: z.record(z.string(), z.unknown()).optional(),
    })
    .nullable()
    .optional(),
  expectFailure: z.boolean().optional(),
  expectNotUsed: z.boolean().optional(),
  description: z.string().optional(),
  judgeExpectation: z.string().nullable().optional(), // Semantic assertion using judge()
});

export const ResourceTestCaseSchema = z.object({
  category: z.enum(["direct", "indirect", "negative"]),
  prompt: z.string().min(1),
  expectNotUsed: z.boolean().optional(),
  description: z.string().optional(),
  judgeExpectation: z.string().nullable().optional(), // Semantic assertion using judge()
});

export const ToolTestPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  tests: z.array(ToolTestCaseSchema),
});

export const ResourceTestPlanSchema = z.object({
  name: z.string().min(1),
  tests: z.array(ResourceTestCaseSchema),
});

export const TestPlanSchema = z.object({
  server: z.string().min(1).optional(),
  tools: z.array(ToolTestPlanSchema),
  resources: z.array(ResourceTestPlanSchema),
});

export type ToolTestCase = z.infer<typeof ToolTestCaseSchema>;
export type ResourceTestCase = z.infer<typeof ResourceTestCaseSchema>;
export type ToolTestPlan = z.infer<typeof ToolTestPlanSchema>;
export type ResourceTestPlan = z.infer<typeof ResourceTestPlanSchema>;
export type TestPlan = z.infer<typeof TestPlanSchema>;
