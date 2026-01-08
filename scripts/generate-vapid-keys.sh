#!/bin/bash

# Generate VAPID keys for Web Push notifications
# Uses @negrel/webpush official generator

echo "Generating VAPID keys..."
echo ""

pnpm exec deno run https://raw.githubusercontent.com/negrel/webpush/master/cmd/generate-vapid-keys.ts

echo ""
echo "================================================================"
echo "USAGE:"
echo "================================================================"
echo "1. Copy the JSON object to VAPID_KEYS_JSON in:"
echo "   - supabase/functions/.env (local)"
echo "   - Supabase Dashboard > Edge Functions > Secrets (prod)"
echo ""
echo "2. Copy 'your application server key' to VITE_PUBLIC_VAPID_KEY in:"
echo "   - .env.local (local)"
echo "   - Cloudflare Pages environment variables (prod)"
echo "================================================================"
