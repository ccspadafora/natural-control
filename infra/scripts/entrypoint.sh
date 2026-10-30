#!/bin/sh
set -eu

echo "waiting for postgres..."
i=0
until python - <<'PY'
import os, sys
import psycopg
try:
    with psycopg.connect(
        host=os.environ.get("POSTGRES_HOST", "db"),
        port=os.environ.get("POSTGRES_PORT", "5432"),
        user=os.environ.get("POSTGRES_USER", "nc"),
        password=os.environ.get("POSTGRES_PASSWORD", "nc"),
        dbname=os.environ.get("POSTGRES_DB", "nc"),
        connect_timeout=3,
    ) as conn:
        conn.execute("SELECT 1")
except Exception as exc:
    print(exc, file=sys.stderr)
    sys.exit(1)
PY
do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "postgres not ready" >&2
    exit 1
  fi
  sleep 2
done

exec "$@"
