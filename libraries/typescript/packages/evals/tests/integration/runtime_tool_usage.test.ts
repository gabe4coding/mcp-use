import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect } from "vitest";
import { describeIfConfigured, createEvalAgent } from "../../src/index.js";

async function writeConfig(serverPath: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "evals-config-"));
  const configPath = path.join(dir, "eval.config.json");
  await fs.writeFile(
    configPath,
    JSON.stringify(
      {
        default: { runAgent: "run", judgeAgent: "judge" },
        agents: {
          run: { provider: "openai", model: "gpt-5.2" },
          judge: { provider: "openai", model: "gpt-5.2" },
        },
        servers: {
          simple: {
            type: "stdio",
            command: "tsx",
            args: [serverPath],
          },
        },
        defaults: { timeout: 30000, retries: 0, serverLifecycle: "suite" },
      },
      null,
      2
    )
  );
  return configPath;
}

describeIfConfigured("eval runtime tool usage", () => {
  it("captures tool usage and inputs", async () => {
    // Path from evals package to mcp-use package's test server
    const serverPath = path.resolve(
      process.cwd(),
      "../mcp-use/tests/servers/simple_server.ts"
    );
    const configPath = await writeConfig(serverPath);

    const agent = await createEvalAgent({
      configPath,
      servers: ["simple"],
    });

    const result = await agent.run("Use the add tool with a=1 and b=2");

    expect(result).toHaveUsedTool("add");
    expect(result).toHaveToolCallWith("add", { a: 1, b: 2 });

    await agent.cleanup();
  }, 60000);
});
