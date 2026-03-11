/**
 * UUID 工具函数
 *
 * [INPUT]: 无
 * [OUTPUT]: 对外提供 generateUuid
 * [POS]: lib 通用工具模块，供前端各处生成兼容 ID
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

function createUuidWithMathRandom(): string {
  let timestamp = Date.now();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const randomValue = (timestamp + Math.random() * 16) % 16 | 0;
    timestamp = Math.floor(timestamp / 16);

    if (char === 'x') {
      return randomValue.toString(16);
    }

    return ((randomValue & 0x3) | 0x8).toString(16);
  });
}

export function generateUuid(): string {
  const webCrypto = globalThis.crypto;

  if (webCrypto?.randomUUID) {
    return webCrypto.randomUUID();
  }

  if (webCrypto?.getRandomValues) {
    // 某些通过真实 IP 的 HTTP 访问场景下，randomUUID 不可用，但 getRandomValues 仍可作为降级方案。
    const bytes = webCrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return createUuidWithMathRandom();
}
