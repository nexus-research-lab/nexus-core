from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace


class FakeStateStore:
    """返回固定状态的测试替身。"""

    def __init__(self, row=None) -> None:
        self.row = row

    async def get_state(self, agent_id: str):
        del agent_id
        return self.row


class FakeEventQueue:
    """记录系统事件入队参数。"""

    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    async def enqueue(self, **fields):
        self.calls.append(fields)
        return SimpleNamespace(**fields)


class FakeScheduler:
    """记录调度层调用的替身。"""

    def __init__(self) -> None:
        self.start_calls = 0
        self.stop_calls = 0
        self.sync_calls: list[tuple[str, object]] = []
        self.request_calls: list[tuple[str, str]] = []
        self.runtime = {}

    async def start(self) -> None:
        self.start_calls += 1

    async def stop(self) -> None:
        self.stop_calls += 1

    async def sync_agent(self, agent_id: str, config) -> None:
        self.sync_calls.append((agent_id, config))

    async def request_wake(self, *, agent_id: str, mode: str):
        self.request_calls.append((agent_id, mode))
        return {
            "agent_id": agent_id,
            "mode": mode,
            "scheduled": mode == "now",
        }

    def get_runtime_status(self, agent_id: str) -> dict[str, object]:
        return dict(self.runtime.get(agent_id, {}))


class FakeDispatcher:
    """记录 dispatcher 调用。"""

    def __init__(self) -> None:
        self.calls: list[tuple[str, object]] = []

    async def dispatch(self, *, agent_id: str, config):
        self.calls.append((agent_id, config))
        return None


def _prepare_service_import(monkeypatch) -> None:
    monkeypatch.setenv("ENV_FILE", "/dev/null")
    monkeypatch.setenv("DEBUG", "false")
    sys.modules.pop("agent.config.config", None)
    sys.modules.pop("agent.service.automation.heartbeat.heartbeat_service", None)


def test_heartbeat_service_returns_status_merged_from_store_and_scheduler(monkeypatch):
    async def scenario():
        from agent.service.automation.heartbeat.heartbeat_service import HeartbeatService

        last_heartbeat_at = datetime(2026, 4, 10, 8, 0, tzinfo=timezone.utc)
        last_ack_at = datetime(2026, 4, 10, 8, 1, tzinfo=timezone.utc)
        next_run_at = datetime(2026, 4, 10, 8, 30, tzinfo=timezone.utc)
        scheduler = FakeScheduler()
        scheduler.runtime["nexus"] = {
            "running": True,
            "next_run_at": next_run_at,
            "pending_wake": False,
        }
        service = HeartbeatService(
            state_store=FakeStateStore(
                SimpleNamespace(
                    agent_id="nexus",
                    enabled=True,
                    every_seconds=60,
                    target_mode="last",
                    ack_max_chars=120,
                    last_heartbeat_at=last_heartbeat_at,
                    last_ack_at=last_ack_at,
                )
            ),
            scheduler=scheduler,
            dispatcher=FakeDispatcher(),
            system_event_queue=FakeEventQueue(),
        )

        status = await service.get_status("nexus")

        assert status.agent_id == "nexus"
        assert status.enabled is True
        assert status.every_seconds == 60
        assert status.target_mode == "last"
        assert status.ack_max_chars == 120
        assert status.running is True
        assert status.pending_wake is False
        assert status.next_run_at == next_run_at
        assert status.last_heartbeat_at == last_heartbeat_at
        assert status.last_ack_at == last_ack_at
        assert scheduler.sync_calls
        synced_agent_id, synced_config = scheduler.sync_calls[0]
        assert synced_agent_id == "nexus"
        assert synced_config.every_seconds == 60

    _prepare_service_import(monkeypatch)
    asyncio.run(scenario())


def test_heartbeat_service_wake_enqueues_event_text_and_delegates_to_scheduler(monkeypatch):
    async def scenario():
        from agent.service.automation.heartbeat.heartbeat_service import HeartbeatService

        scheduler = FakeScheduler()
        event_queue = FakeEventQueue()
        service = HeartbeatService(
            state_store=FakeStateStore(),
            scheduler=scheduler,
            dispatcher=FakeDispatcher(),
            system_event_queue=event_queue,
        )

        wake = await service.wake(
            agent_id="nexus",
            mode="now",
            text="check disk pressure",
        )

        assert scheduler.request_calls == [("nexus", "now")]
        assert wake.agent_id == "nexus"
        assert wake.mode == "now"
        assert wake.scheduled is True
        assert event_queue.calls == [
            {
                "event_type": "heartbeat.wake",
                "source_type": "heartbeat",
                "source_id": "nexus",
                "payload": {
                    "agent_id": "nexus",
                    "text": "check disk pressure",
                    "wake_mode": "now",
                },
            }
        ]

    _prepare_service_import(monkeypatch)
    asyncio.run(scenario())


def test_heartbeat_scheduler_dispatches_immediate_wake_requests():
    async def scenario():
        from agent.schema.model_automation import AutomationHeartbeatConfig
        from agent.service.automation.heartbeat.heartbeat_scheduler import HeartbeatScheduler

        dispatcher = FakeDispatcher()
        scheduler = HeartbeatScheduler(
            dispatcher=dispatcher,
            tick_seconds=0.01,
        )
        await scheduler.start()
        await scheduler.sync_agent(
            "nexus",
            AutomationHeartbeatConfig(
                agent_id="nexus",
                enabled=True,
                every_seconds=60,
                target_mode="none",
            ),
        )

        wake = await scheduler.request_wake(agent_id="nexus", mode="now")
        await asyncio.sleep(0.05)
        runtime = scheduler.get_runtime_status("nexus")
        await scheduler.stop()

        assert wake["scheduled"] is True
        assert dispatcher.calls
        dispatched_agent_id, dispatched_config = dispatcher.calls[0]
        assert dispatched_agent_id == "nexus"
        assert dispatched_config.agent_id == "nexus"
        assert runtime["running"] is True
        assert runtime["last_dispatch_reason"] == "wake-now"
        assert runtime["pending_wake"] is False

    asyncio.run(scenario())


def test_heartbeat_scheduler_dispatches_next_heartbeat_on_due_tick():
    async def scenario():
        from agent.schema.model_automation import AutomationHeartbeatConfig
        from agent.service.automation.heartbeat.heartbeat_scheduler import HeartbeatScheduler

        dispatcher = FakeDispatcher()
        scheduler = HeartbeatScheduler(
            dispatcher=dispatcher,
            tick_seconds=0.01,
        )
        await scheduler.start()
        await scheduler.sync_agent(
            "nexus",
            AutomationHeartbeatConfig(
                agent_id="nexus",
                enabled=True,
                every_seconds=1,
                target_mode="none",
            ),
        )

        await scheduler.request_wake(agent_id="nexus", mode="next-heartbeat")
        scheduler._states["nexus"].next_run_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        await asyncio.sleep(0.05)
        runtime = scheduler.get_runtime_status("nexus")
        await scheduler.stop()

        assert dispatcher.calls
        assert runtime["last_dispatch_reason"] == "heartbeat"
        assert runtime["pending_wake"] is False
        assert runtime["next_run_at"] > datetime.now(timezone.utc)

    asyncio.run(scenario())
