/**
 * 权限类型定义
 *
 * [INPUT]: 无
 * [OUTPUT]: 对外提供权限请求、建议与响应类型
 * [POS]: types 模块的权限类型中心，被 hook 与权限弹窗消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { UserQuestionAnswer } from './ask-user-question';

export type PermissionRiskLevel = 'low' | 'medium' | 'high';
export type PermissionDecision = 'allow' | 'deny';
export type PermissionInteractionMode = 'permission' | 'question';
export type PermissionUpdateType =
  | 'addRules'
  | 'replaceRules'
  | 'removeRules'
  | 'setMode'
  | 'addDirectories'
  | 'removeDirectories';
export type PermissionBehavior = 'allow' | 'deny' | 'ask';
export type PermissionDestination = 'userSettings' | 'projectSettings' | 'localSettings' | 'session';

export interface PermissionRule {
  tool_name: string;
  rule_content?: string | null;
}

export interface PermissionUpdate {
  type: PermissionUpdateType;
  rules?: PermissionRule[];
  behavior?: PermissionBehavior;
  mode?: 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions';
  directories?: string[];
  destination?: PermissionDestination;
}

export interface PendingPermission {
  request_id: string;
  tool_name: string;
  tool_input: Record<string, any>;
  session_key?: string | null;
  agent_id?: string | null;
  message_id?: string | null;
  caused_by?: string | null;
  interaction_mode?: PermissionInteractionMode;
  risk_level?: PermissionRiskLevel;
  risk_label?: string;
  summary?: string;
  suggestions?: PermissionUpdate[];
  expires_at?: string;
}

export interface PermissionDecisionPayload {
  request_id: string;
  decision: PermissionDecision;
  user_answers?: UserQuestionAnswer[];
  updated_permissions?: PermissionUpdate[];
  message?: string;
  interrupt?: boolean;
}

export function buildPermissionSignature(
  tool_name: string,
  tool_input: Record<string, unknown>,
): string {
  return `${tool_name}:${stableStringify(tool_input)}`;
}

function stableStringify(value: unknown): string {
  if (value == null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(String(value));
}
