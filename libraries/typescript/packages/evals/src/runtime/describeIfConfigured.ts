import { describe, it } from "vitest";

export function describeIfConfigured(name: string, fn: () => void): void {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  if (!hasOpenAI && !hasAnthropic) {
    describe.skip(name, () => {
      it("skipped: missing API keys for evals", () => {});
    });
     
    console.warn(
      `⚠ Skipping "${name}" — missing OPENAI_API_KEY or ANTHROPIC_API_KEY`
    );
    return;
  }

  describe(name, fn);
}
