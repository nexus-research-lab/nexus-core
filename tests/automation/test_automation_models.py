from __future__ import annotations

import pytest
from pydantic import ValidationError

from agent.schema.model_automation import (
    AutomationCronJobCreate,
    AutomationCronSchedule,
    AutomationDeliveryTarget,
    AutomationHeartbeatConfig,
    AutomationSessionTarget,
)


def test_cron_job_create_defaults_delivery_and_status():
    job = AutomationCronJobCreate(
        name="daily brief",
        agent_id="nexus",
        schedule=AutomationCronSchedule(kind="every", interval_seconds=3600),
        instruction="summarize overnight updates",
    )

    assert job.delivery.mode == "none"
    assert job.session_target.kind == "isolated"
    assert job.enabled is True


def test_heartbeat_config_defaults_to_silent_delivery():
    config = AutomationHeartbeatConfig(agent_id="nexus")

    assert config.enabled is False
    assert config.target_mode == "none"
    assert config.ack_max_chars == 300


def test_automation_schedule_and_delivery_kinds_match_expected_shapes():
    every = AutomationCronSchedule(kind="every", interval_seconds=3600)
    delivery = AutomationDeliveryTarget()
    session_target = AutomationSessionTarget()

    assert every.kind == "every"
    assert delivery.mode == "none"
    assert session_target.kind == "isolated"


def test_invalid_schedule_kind_rejected():
    with pytest.raises(ValidationError):
        AutomationCronSchedule(kind="hourly", interval_seconds=3600)
