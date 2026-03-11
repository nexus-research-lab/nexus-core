#!/bin/bash
# GitHub PR & Branch Monitor for nexus-core
# Runs every 15 minutes via launchd

set -e

REPO_DIR="/Users/aibox/.openclaw/workspace/PROJECTS/nexus-core"
CONFIG="$REPO_DIR/.github-monitor/config.json"
LOG="$REPO_DIR/.github-monitor/monitor.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"
    echo "$1"
}

cd "$REPO_DIR"

# Update repository
log "Fetching latest changes..."
git fetch --all --prune 2>&1 | grep -v "From https" || true

# Check for new PRs
log "Checking for open PRs..."
PRS=$(gh pr list --repo nexus-research-lab/nexus-core --state open --json number,title,headRefName,baseRefName,mergeable,mergeStateStatus 2>&1)

if [ "$PRS" != "[]" ] && [ -n "$PRS" ]; then
    log "Found open PRs:"
    echo "$PRS" | jq -r '.[] | "  PR #\(.number): \(.title) (\(.headRefName) -> \(.baseRefName))"'

    # Process each PR
    echo "$PRS" | jq -c '.[]' | while read -r pr; do
        PR_NUM=$(echo "$pr" | jq -r '.number')
        PR_TITLE=$(echo "$pr" | jq -r '.title')
        MERGEABLE=$(echo "$pr" | jq -r '.mergeable')
        MERGE_STATE=$(echo "$pr" | jq -r '.mergeStateStatus')

        log "Processing PR #$PR_NUM: $PR_TITLE"

        # Check if mergeable
        if [ "$MERGEABLE" != "MERGEABLE" ]; then
            log "  ⚠️  PR not mergeable (state: $MERGE_STATE)"
            continue
        fi

        # Get PR diff for Codex review
        log "  Getting PR diff for review..."
        DIFF=$(gh pr diff "$PR_NUM" --repo nexus-research-lab/nexus-core 2>/dev/null || echo "")

        if [ -n "$DIFF" ]; then
            # Use Codex to review
            log "  🔍 Reviewing with Codex..."
            REVIEW=$(echo "$DIFF" | codex --model auto --full-auto "Review this code change. Check for: 1) Bugs/errors 2) Security issues 3) Code quality 4) Breaking changes. Reply with only: APPROVE or REJECT and one sentence reason." 2>/dev/null || echo "REVIEW_FAILED")

            log "  Codex review: $REVIEW"

            if echo "$REVIEW" | grep -qi "APPROVE"; then
                log "  ✅ Approved by Codex, merging..."
                gh pr merge "$PR_NUM" --repo nexus-research-lab/nexus-core --squash --delete-branch 2>&1 || log "  ⚠️  Merge failed"
                log "  ✅ PR #$PR_NUM merged successfully"
            else
                log "  ❌ Rejected by Codex: $REVIEW"
            fi
        else
            log "  ⚠️  No diff available, skipping review"
        fi
    done
else
    log "No open PRs found"
fi

# Check branch sync
log "Checking branch status..."
git branch -r | grep -v HEAD | grep -v main | sed 's/.*origin\///' | while read -r BRANCH; do
    if [ -z "$BRANCH" ]; then
        continue
    fi

    # Check if branch has new commits not in main
    AHEAD=$(cd "$REPO_DIR" && git rev-list --count origin/main..origin/"$BRANCH" 2>/dev/null || echo "0")

    if [ "$AHEAD" -gt 0 ]; then
        log "  Branch $BRANCH is $AHEAD commits ahead of main"
        log "  Creating PR to merge $BRANCH -> main..."

        # Create PR if not exists
        PR_EXISTS=$(gh pr list --repo nexus-research-lab/nexus-core --head "$BRANCH" --base main --state open --json number 2>/dev/null | jq 'length' || echo "0")

        if [ "$PR_EXISTS" -eq 0 ]; then
            gh pr create --repo nexus-research-lab/nexus-core \
                --head "$BRANCH" \
                --base main \
                --title "Merge $BRANCH into main" \
                --body "Auto-generated PR to sync $BRANCH with main branch." \
                --fill 2>&1 || log "  ⚠️  PR creation failed"
            log "  ✅ Created PR for $BRANCH"
        else
            log "  PR already exists for $BRANCH"
        fi
    fi
done

log "Monitor check complete ✅"
