import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect } from "vitest";
import { createEvalAgent, describeIfConfigured } from "../../src/index.js";

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
          resource: {
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

describeIfConfigured("eval runtime resource usage", () => {
  it("captures resource access during a run", async () => {
    // Path relative to evals package
    const serverPath = path.resolve(
      process.cwd(),
      "tests/servers/resource_server.ts"
    );
    const configPath = await writeConfig(serverPath);

    const agent = await createEvalAgent({
      configPath,
      servers: ["resource"],
    });

    const client = (agent as any).client;
    const session = client.requireSession("resource");

    const runPromise = agent.run("Say hello");
    await session.readResource("resource://hello");
    const result = await runPromise;

    expect(result).toHaveUsedResource("hello");

    await agent.cleanup();
  }, 60000);
});
