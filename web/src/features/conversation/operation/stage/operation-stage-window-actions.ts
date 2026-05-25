export type OperationStageWindowKeyboardAction = "focus" | "close" | "minimize" | "zoom";

export interface OperationStageWindowKeyboardInput {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

export function resolve_operation_window_keyboard_action(
  input: OperationStageWindowKeyboardInput,
): OperationStageWindowKeyboardAction | null {
  if (input.altKey || input.shiftKey) {
    return null;
  }
  if (!input.metaKey && !input.ctrlKey) {
    if (input.key === "Enter" || input.key === " ") {
      return "focus";
    }
    if (input.key === "Escape") {
      return "minimize";
    }
    return null;
  }
  if (input.metaKey && !input.ctrlKey) {
    const key = input.key.toLowerCase();
    if (key === "w") {
      return "close";
    }
    if (key === "m") {
      return "minimize";
    }
    if (input.key === "Enter") {
      return "zoom";
    }
  }
  if (input.metaKey && input.ctrlKey && input.key.toLowerCase() === "f") {
    return "zoom";
  }
  return null;
}
