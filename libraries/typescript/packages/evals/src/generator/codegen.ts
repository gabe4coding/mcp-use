import { Project } from "ts-morph";
import { escapeString, truncate } from "./escape.js";
import type { ResourceTestPlan, TestPlan, ToolTestPlan } from "./planSchema.js";

export class EvalCodeGenerator {
  private project: Project;

  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: true,
    });
  }

  generate(plan: TestPlan): string {
    const sourceFile = this.project.createSourceFile("eval.ts", "", {
      overwrite: true,
    });

    sourceFile.addImportDeclaration({
      namedImports: ["describe", "it", "beforeAll", "afterAll", "expect"],
      moduleSpecifier: "vitest",
    });

    sourceFile.addImportDeclaration({
      namedImports: ["createEvalAgent", "describeIfConfigured", "judge"],
      moduleSpecifier: "@mcp-use/evals",
    });

    sourceFile.addImportDeclaration({
      namedImports: ["EvalAgent"],
      moduleSpecifier: "@mcp-use/evals",
      isTypeOnly: true,
    });

    sourceFile.addStatements((writer) => {
      writer.writeLine(
        `describeIfConfigured("${escapeString(plan.server || "eval")} server", () => {`
      );
      writer.indent(() => {
        writer.writeLine("let agent: EvalAgent;");
        writer.blankLine();

        writer.writeLine("beforeAll(async () => {");
        writer.indent(() => {
          writer.writeLine(
            `agent = await createEvalAgent({ servers: ["${escapeString(plan.server || "")}"] });`
          );
        });
        writer.writeLine("});");
        writer.blankLine();

        writer.writeLine("afterAll(async () => {");
        writer.indent(() => {
          writer.writeLine("await agent.cleanup();");
        });
        writer.writeLine("});");
        writer.blankLine();

        for (const tool of plan.tools) {
          this.addToolDescribeBlock(writer, tool);
        }

        for (const resource of plan.resources) {
          this.addResourceDescribeBlock(writer, resource);
        }
      });
      writer.writeLine("});");
    });

    sourceFile.formatText({
      indentSize: 2,
      convertTabsToSpaces: true,
    });

    return sourceFile.getFullText();
  }

  private addToolDescribeBlock(writer: any, tool: ToolTestPlan): void {
    writer.writeLine(`describe("${escapeString(tool.name)}", () => {`);
    writer.indent(() => {
      const categories = ["direct", "indirect", "negative", "error"] as const;
      for (const category of categories) {
        const tests = tool.tests.filter((t) => t.category === category);
        if (!tests.length) continue;

        writer.writeLine(`describe("${category} prompts", () => {`);
        writer.indent(() => {
          for (const test of tests) {
            this.addToolTest(writer, test, tool.name);
          }
        });
        writer.writeLine("});");
        writer.blankLine();
      }
    });
    writer.writeLine("});");
    writer.blankLine();
  }

  private addResourceDescribeBlock(
    writer: any,
    resource: ResourceTestPlan
  ): void {
    writer.writeLine(`describe("${escapeString(resource.name)}", () => {`);
    writer.indent(() => {
      const categories = ["direct", "indirect", "negative"] as const;
      for (const category of categories) {
        const tests = resource.tests.filter((t) => t.category === category);
        if (!tests.length) continue;

        writer.writeLine(`describe("${category} prompts", () => {`);
        writer.indent(() => {
          for (const test of tests) {
            this.addResourceTest(writer, test, resource.name);
          }
        });
        writer.writeLine("});");
        writer.blankLine();
      }
    });
    writer.writeLine("});");
  }

  private addToolTest(
    writer: any,
    test: {
      prompt: string;
      expectFailure?: boolean;
      expectNotUsed?: boolean;
      expectedToolCall?: {
        name?: string;
        input?: Record<string, unknown>;
      } | null;
      judgeExpectation?: string | null;
    },
    toolName: string
  ): void {
    const action = test.expectNotUsed ? "NOT " : "";
    const description = `should ${action}call ${toolName}: '${truncate(test.prompt, 50)}'`;
    const escapedPrompt = escapeString(test.prompt);

    writer.writeLine(`it("${escapeString(description)}", async () => {`);
    writer.indent(() => {
      writer.writeLine(`const result = await agent.run("${escapedPrompt}");`);
      if (test.expectNotUsed) {
        writer.writeLine(
          `expect(result).not.toHaveUsedTool("${escapeString(toolName)}");`
        );
      } else if (test.expectFailure) {
        writer.writeLine(
          `expect(result).toHaveToolCallFailed("${escapeString(toolName)}");`
        );
      } else {
        writer.writeLine(
          `expect(result).toHaveUsedTool("${escapeString(toolName)}");`
        );
        if (test.expectedToolCall?.input) {
          writer.writeLine(
            `expect(result).toHaveToolCallWith("${escapeString(toolName)}", ${JSON.stringify(
              test.expectedToolCall.input
            )});`
          );
        }
      }

      // Add judge assertion if specified
      if (test.judgeExpectation) {
        writer.writeLine(
          `const judgeResult = await judge(result.output, "${escapeString(test.judgeExpectation)}");`
        );
        writer.writeLine(`expect(judgeResult.score).toBeGreaterThan(0.7);`);
      }
    });
    writer.writeLine("});");
    writer.blankLine();
  }

  private addResourceTest(
    writer: any,
    test: {
      prompt: string;
      expectNotUsed?: boolean;
      judgeExpectation?: string | null;
    },
    resourceName: string
  ): void {
    const action = test.expectNotUsed ? "NOT " : "";
    const description = `should ${action}access ${resourceName}: '${truncate(test.prompt, 50)}'`;
    const escapedPrompt = escapeString(test.prompt);

    writer.writeLine(`it("${escapeString(description)}", async () => {`);
    writer.indent(() => {
      writer.writeLine(`const result = await agent.run("${escapedPrompt}");`);
      if (test.expectNotUsed) {
        writer.writeLine(
          `expect(result).not.toHaveUsedResource("${escapeString(resourceName)}");`
        );
      } else {
        writer.writeLine(
          `expect(result).toHaveUsedResource("${escapeString(resourceName)}");`
        );
      }

      // Add judge assertion if specified
      if (test.judgeExpectation) {
        writer.writeLine(
          `const judgeResult = await judge(result.output, "${escapeString(test.judgeExpectation)}");`
        );
        writer.writeLine(`expect(judgeResult.score).toBeGreaterThan(0.7);`);
      }
    });
    writer.writeLine("});");
    writer.blankLine();
  }
}
