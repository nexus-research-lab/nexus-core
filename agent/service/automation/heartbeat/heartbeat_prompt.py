from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


ACK_TOKEN = "HEARTBEAT_OK"


@dataclass(slots=True)
class HeartbeatTask:
    name: str
    interval: str
    prompt: str


@dataclass(slots=True)
class HeartbeatFilterResult:
    should_deliver: bool
    text: str


def parse_heartbeat_tasks(text: str) -> list[HeartbeatTask]:
    """Parse the ``tasks:`` block from HEARTBEAT.md content."""

    # 只提取 tasks 段落，避免把其他章节误当成定时任务。
    tasks_block = _extract_tasks_block(text.splitlines())
    return _parse_task_items(tasks_block)


def filter_heartbeat_response(text: str, ack_max_chars: int = 300) -> HeartbeatFilterResult:
    """Suppress heartbeat-only acknowledgements while preserving real alerts."""

    normalized = text.strip()
    # 纯 HEARTBEAT_OK 视为确认回执，直接吞掉；带额外内容则原样放行。
    if normalized == ACK_TOKEN:
        return HeartbeatFilterResult(should_deliver=False, text="")
    return HeartbeatFilterResult(should_deliver=True, text=text)


def _extract_tasks_block(lines: Iterable[str]) -> list[str]:
    tasks_block: list[str] = []
    in_tasks = False
    tasks_indent = 0

    for raw_line in lines:
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped:
            if in_tasks:
                tasks_block.append("")
            continue

        indent = len(line) - len(line.lstrip())
        if not in_tasks:
            if stripped == "tasks:":
                in_tasks = True
                tasks_indent = indent
            continue

        # 一旦回到同级或更高层级，就说明 tasks 段落结束了。
        if indent <= tasks_indent and not stripped.startswith("-"):
            break

        tasks_block.append(line[tasks_indent + 2 :] if line.startswith(" " * (tasks_indent + 2)) else line)

    return tasks_block


def _parse_task_items(lines: list[str]) -> list[HeartbeatTask]:
    tasks: list[HeartbeatTask] = []
    current: dict[str, str] | None = None

    for raw_line in lines:
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped:
            continue

        # 每个短横线条目代表一个新的 task，前一个 task 先落盘。
        if stripped.startswith("- "):
            if current:
                task = _build_task(current)
                if task is not None:
                    tasks.append(task)
            current = {}
            key, value = _parse_key_value(stripped[2:])
            if key:
                current[key] = value
            continue

        if current is None:
            continue

        key, value = _parse_key_value(stripped)
        if key:
            current[key] = value

    if current:
        task = _build_task(current)
        if task is not None:
            tasks.append(task)

    return tasks


def _parse_key_value(line: str) -> tuple[str, str]:
    if ":" not in line:
        return "", ""
    key, value = line.split(":", 1)
    return key.strip(), _clean_value(value.strip())


def _clean_value(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def _build_task(fields: dict[str, str]) -> HeartbeatTask | None:
    name = fields.get("name", "").strip()
    interval = fields.get("interval", "").strip()
    prompt = fields.get("prompt", "").strip()
    if not name and not interval and not prompt:
        return None
    return HeartbeatTask(name=name, interval=interval, prompt=prompt)
