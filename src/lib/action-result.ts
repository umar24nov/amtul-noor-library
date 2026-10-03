export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Set when the action succeeded and the client should close / navigate. */
  done?: boolean;
};

export const IDLE_STATE: ActionState = { status: "idle" };

export function errorState(
  message: string,
  fieldErrors?: Record<string, string>,
): ActionState {
  return { status: "error", message, fieldErrors };
}

export function successState(
  message: string,
  fieldErrors?: Record<string, string>,
): ActionState {
  return { status: "success", message, fieldErrors, done: true };
}

/** Pulls the first useful message out of a Prisma error. */
export function prismaErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Unique constraint")) {
    return "That record already exists.";
  }
  return "Something went wrong while saving. Please try again.";
}