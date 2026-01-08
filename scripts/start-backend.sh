#!/bin/bash

# Start Supabase local backend and Edge Functions
# Usage: ./scripts/start-backend.sh

set -e

echo "Starting Supabase local stack..."
supabase start

echo ""
echo "Starting Edge Functions with hot reload..."
echo "Press Ctrl+C to stop"
echo ""

supabase functions serve --env-file supabase/functions/.env.local
