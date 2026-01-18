export class EvalError extends Error {
  readonly code: string;

  constructor(message: string, code = "EVAL_ERROR", cause?: unknown) {
    super(message);
    this.name = "EvalError";
    this.code = code;
    if (cause) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class EvalConfigError extends EvalError {
  constructor(message: string, cause?: unknown) {
    super(message, "EVAL_CONFIG_ERROR", cause);
    this.name = "EvalConfigError";
  }
}

export class PlannerError extends EvalError {
  constructor(message: string, cause?: unknown) {
    super(message, "PLANNER_ERROR", cause);
    this.name = "PlannerError";
  }
}

export class CliExitError extends EvalError {
  readonly exitCode: number;

  constructor(message: string, exitCode: number, cause?: unknown) {
    super(message, "CLI_EXIT", cause);
    this.name = "CliExitError";
    this.exitCode = exitCode;
  }
}
