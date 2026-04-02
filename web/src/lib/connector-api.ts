/**
 * Connector API 服务模块
 *
 * [INPUT]: 依赖 @/types/connector, @/types/api
 * [OUTPUT]: 对外提供连接器 CRUD + OAuth 操作
 */

import { ConnectorDetail, ConnectorInfo } from '@/types/connector';
import { ApiResponse } from '@/types/api';
import { getAgentApiBaseUrl } from '@/config/options';

const BASE = getAgentApiBaseUrl();

/** 获取连接器列表 */
export const getConnectorsApi = async (params?: {
  q?: string;
  category?: string;
  status?: string;
}): Promise<ConnectorInfo[]> => {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.category) sp.set('category', params.category);
  if (params?.status) sp.set('status', params.status);
  const qs = sp.toString();
  const url = `${BASE}/connectors${qs ? `?${qs}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`获取连接器列表失败: ${res.statusText}`);
  const result: ApiResponse<ConnectorInfo[]> = await res.json();
  return result.data;
};

/** 获取已连接连接器数量 */
export const getConnectedCountApi = async (): Promise<number> => {
  const connectors = await getConnectorsApi();
  return connectors.filter((connector) => connector.connection_state === "connected").length;
};

/** 获取连接器详情 */
export const getConnectorDetailApi = async (connector_id: string): Promise<ConnectorDetail> => {
  const res = await fetch(`${BASE}/connectors/${connector_id}`);
  if (!res.ok) throw new Error(`获取连接器详情失败: ${res.statusText}`);
  const result: ApiResponse<ConnectorDetail> = await res.json();
  return result.data;
};

/** 授权连接 */
export const connectConnectorApi = async (
  connector_id: string,
  body?: { auth_code?: string; api_key?: string; token?: string; redirect_uri?: string },
): Promise<ConnectorInfo> => {
  const res = await fetch(`${BASE}/connectors/${connector_id}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`连接失败: ${res.statusText}`);
  const result: ApiResponse<ConnectorInfo> = await res.json();
  return result.data;
};

/** 断开连接 */
export const disconnectConnectorApi = async (connector_id: string): Promise<ConnectorInfo> => {
  const res = await fetch(`${BASE}/connectors/${connector_id}/disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`断开连接失败: ${res.statusText}`);
  const result: ApiResponse<ConnectorInfo> = await res.json();
  return result.data;
};

/** 获取 OAuth 授权 URL */
export const getConnectorAuthUrlApi = async (
  connector_id: string,
  redirect_uri?: string,
): Promise<{ auth_url: string }> => {
  const sp = new URLSearchParams();
  if (redirect_uri) sp.set('redirect_uri', redirect_uri);
  const qs = sp.toString();
  const url = `${BASE}/connectors/${connector_id}/auth-url${qs ? `?${qs}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`获取授权 URL 失败: ${res.statusText}`);
  const result: ApiResponse<{ auth_url: string }> = await res.json();
  return result.data;
};

/** 完成 OAuth 回调 */
export const completeConnectorOAuthApi = async (
  code: string,
  state: string,
  redirect_uri?: string,
): Promise<ConnectorInfo> => {
  const body = { code, state, redirect_uri };
  const res = await fetch(`${BASE}/connectors/oauth/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OAuth 回调失败: ${res.statusText}`);
  const result: ApiResponse<ConnectorInfo> = await res.json();
  return result.data;
};
