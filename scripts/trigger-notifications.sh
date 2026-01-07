#!/bin/bash

# Trigger the pill-notifications Edge Function locally
# Usage: ./scripts/trigger-notifications.sh

FUNCTION_URL="http://localhost:54321/functions/v1/pill-notifications"
CRON_SECRET="local-dev-secret"

echo "Triggering pill-notifications function..."
echo ""

curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  --silent | jq .

echo ""
echo "Done."
