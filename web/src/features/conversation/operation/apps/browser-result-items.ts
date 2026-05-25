import type { NexusOperationEvent } from "../operation-types";

export interface BrowserResultItem {
  title: string;
  url: string;
  snippet: string;
}

export function build_browser_result_items({
  event,
  lines,
  query,
}: {
  event: NexusOperationEvent;
  lines: string[];
  query: string;
}): BrowserResultItem[] {
  const source_lines = lines.length
    ? lines
    : event.phase === "running"
      ? ["正在等待页面返回内容", "加载完成后会保留页面摘要和可回看记录。"]
      : [event.summary ?? query];

  return source_lines
    .filter((line) => line.trim())
    .slice(0, 6)
    .map((line, index) => normalize_browser_result_line(line, query, index));
}

function normalize_browser_result_line(line: string, query: string, index: number): BrowserResultItem {
  const trimmed = line.trim();
  if (looks_like_url(trimmed)) {
    return {
      title: readable_url_title(trimmed),
      url: trimmed,
      snippet: query,
    };
  }

  const markdown_link = trimmed.match(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/i);
  if (markdown_link) {
    return {
      title: markdown_link[1],
      url: markdown_link[2],
      snippet: trimmed.replace(markdown_link[0], "").replace(/^[-:\s]+/, "") || query,
    };
  }

  const url_match = trimmed.match(/https?:\/\/\S+/i);
  if (url_match) {
    const url = url_match[0].replace(/[),.;]+$/, "");
    return {
      title: trimmed.slice(0, url_match.index).replace(/^[-*\s]+|[-:\s]+$/g, "") || readable_url_title(url),
      url,
      snippet: trimmed.replace(url_match[0], "").replace(/^[-:\s]+/, "") || query,
    };
  }

  return {
    title: index === 0 ? query : `结果 ${index + 1}`,
    url: `nexus-search://${encodeURIComponent(query)}/${index + 1}`,
    snippet: trimmed,
  };
}

function readable_url_title(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.split("/").filter(Boolean).at(-1);
    return path ? `${parsed.hostname} / ${decodeURIComponent(path)}` : parsed.hostname;
  } catch {
    return url;
  }
}

function looks_like_url(value: string): boolean {
  return /^https?:\/\//i.test(value);
}
