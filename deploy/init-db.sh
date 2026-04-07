#!/usr/bin/env bash

set -euo pipefail

: "${DATABASE_URL:=sqlite+aiosqlite:////home/agent/.nexus/data/nexus.db}"
export DATABASE_URL

if [[ "${DATABASE_URL}" == sqlite+aiosqlite:///* ]]; then
    DB_PATH="${DATABASE_URL#sqlite+aiosqlite:///}"
    DB_PATH="${DB_PATH/#\~/${HOME}}"
    mkdir -p "$(dirname "${DB_PATH}")"
elif [[ "${DATABASE_URL}" == sqlite:///* ]]; then
    DB_PATH="${DATABASE_URL#sqlite:///}"
    DB_PATH="${DB_PATH/#\~/${HOME}}"
    mkdir -p "$(dirname "${DB_PATH}")"
fi

echo "Applying database migrations..."
python -m alembic upgrade head
echo "Database migration completed."

exec "$@"
