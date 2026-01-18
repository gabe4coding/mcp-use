import fs from "node:fs/promises";
import clipboard from "clipboardy";
import { CliExitError } from "../shared/errors.js";

export type OutputMode = "file" | "stdout" | "clipboard" | "all";

export interface OutputOptions {
  mode: OutputMode;
  filename: string;
}

export async function writeOutput(
  code: string,
  options: OutputOptions
): Promise<void> {
  const { mode, filename } = options;

  if (mode === "file" || mode === "all") {
    await fs.writeFile(filename, code);
  }

  if (mode === "clipboard" || mode === "all") {
    try {
      await clipboard.write(code);
    } catch (error) {
      throw new CliExitError("Failed to copy output to clipboard", 5, error);
    }
  }

  if (mode === "stdout" || mode === "all") {
    process.stdout.write(`${code}\n`);
  }
}
