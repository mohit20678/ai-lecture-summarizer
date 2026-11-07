#!/bin/bash
ROOT="$(cd "$(dirname "$0")" && pwd)"

trap 'taskkill //F //IM node.exe > /dev/null 2>&1' EXIT

(cd "$ROOT/server" && node index.js) &

cd "$ROOT/client" && npm run dev -- --open
