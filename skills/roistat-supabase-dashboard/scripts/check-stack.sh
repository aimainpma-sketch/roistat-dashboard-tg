#!/usr/bin/env bash
set -euo pipefail

echo "Workspace: $(pwd)"
echo

echo "Node:"
node -v
npm -v
echo

echo "Git:"
git rev-parse --is-inside-work-tree 2>/dev/null || echo "not-initialized"
echo

echo "Codex MCP:"
codex mcp list || true
echo

echo "Supabase CLI:"
npx supabase --version || true
