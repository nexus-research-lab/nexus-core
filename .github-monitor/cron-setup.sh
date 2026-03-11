#!/bin/bash
# Setup cron job for GitHub Monitor (backup, runs every 15 minutes)

CRON_JOB="*/15 * * * * /Users/aibox/.openclaw/workspace/PROJECTS/nexus-core/.github-monitor/monitor.sh >> /Users/aibox/.openclaw/workspace/PROJECTS/nexus-core/.github-monitor/cron.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "monitor.sh"; then
    echo "Cron job already exists"
    crontab -l 2>/dev/null | grep "monitor.sh"
else
    # Add cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Cron job added:"
    echo "$CRON_JOB"
fi

echo ""
echo "Current crontab:"
crontab -l
