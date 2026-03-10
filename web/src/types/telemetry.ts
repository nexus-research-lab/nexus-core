import { TodoItem } from "@/components/todo/agent-task-widget";
import { ToolCall } from "@/types/message";

export interface PermissionTelemetry {
  request_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
}

export interface UsageTelemetry {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  latest_duration_ms: number | null;
  latest_cost_usd: number | null;
  completed_rounds: number;
}

export interface SessionTelemetry {
  is_loading: boolean;
  todos: TodoItem[];
  tool_calls: ToolCall[];
  pending_permission: PermissionTelemetry | null;
  usage: UsageTelemetry;
}
