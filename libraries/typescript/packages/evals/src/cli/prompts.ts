import { checkbox, select } from "@inquirer/prompts";
import type { ServerSchema } from "../generator/inspectServers.js";

export async function selectServers(schemas: ServerSchema[]): Promise<string[]> {
  if (!schemas.length) {
    console.log("No servers available");
    return [];
  }
  return checkbox({
    message: "Select servers to test:",
    choices: schemas.map((schema) => ({
      name: `${schema.name} (${schema.tools.length} tools, ${schema.resources.length} resources)`,
      value: schema.name,
      checked: true,
    })),
  });
}

export async function selectTools(schema: ServerSchema): Promise<string[]> {
  if (!schema.tools.length) return [];
  return checkbox({
    message: `Select tools from ${schema.name}:`,
    choices: schema.tools.map((tool) => ({
      name: `${tool.name} - ${tool.description}`,
      value: tool.name,
      checked: true,
    })),
  });
}

export async function selectResources(schema: ServerSchema): Promise<string[]> {
  if (!schema.resources.length) return [];
  return checkbox({
    message: `Select resources from ${schema.name}:`,
    choices: schema.resources.map((resource) => ({
      name: `${resource.name} - ${resource.description || resource.uri}`,
      value: resource.name,
      checked: true,
    })),
  });
}

export async function selectPlanAction(): Promise<"yes" | "regenerate" | "cancel"> {
  return select({
    message: "Accept plan?",
    choices: [
      { name: "Yes - generate code", value: "yes" },
      { name: "Regenerate - ask LLM for new plan", value: "regenerate" },
      { name: "Cancel", value: "cancel" },
    ],
  });
}

export async function selectOutputFormat(): Promise<
  "file" | "stdout" | "clipboard" | "all"
> {
  return select({
    message: "Output format:",
    choices: [
      { name: "Write to file", value: "file" },
      { name: "Copy to clipboard", value: "clipboard" },
      { name: "Print to stdout", value: "stdout" },
      { name: "All of the above", value: "all" },
    ],
  });
}
