import { PlannerError } from "../shared/errors.js";
import { TestPlanSchema, type TestPlan } from "./planSchema.js";

function sanitizeJson(jsonStr: string): string {
  // Replace JavaScript-style undefined with null for valid JSON
  return jsonStr.replace(/:\s*undefined\b/g, ": null");
}

function extractBalancedJson(
  content: string,
  startIndex: number
): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === "\\") {
      escape = true;
      continue;
    }

    if (char === '"' && !escape) {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return content.slice(startIndex, i + 1);
      }
    }
  }

  return null;
}

export function extractPlannerJson(content: string): unknown {
  const fenced = content.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) {
    try {
      return JSON.parse(sanitizeJson(fenced[1]));
    } catch (error) {
      throw new PlannerError("Planner response JSON is invalid", error);
    }
  }

  const firstBrace = content.indexOf("{");
  if (firstBrace !== -1) {
    const extracted = extractBalancedJson(content, firstBrace);
    if (extracted) {
      try {
        return JSON.parse(sanitizeJson(extracted));
      } catch (error) {
        throw new PlannerError("Planner response JSON is invalid", error);
      }
    }
  }

  throw new PlannerError("Planner response did not include JSON output");
}

export function validatePlan(data: unknown): TestPlan {
  const parsed = TestPlanSchema.safeParse(data);
  if (!parsed.success) {
    throw new PlannerError(`Planner output failed validation: ${parsed.error}`);
  }
  return parsed.data;
}
