#!/usr/bin/env node

import { runCli } from "./cli/index.js";

runCli().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
