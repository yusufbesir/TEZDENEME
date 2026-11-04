#!/bin/bash
# Manual end-to-end check with the REAL Codex CLI: one workflow with a single read-only "plan" step (one small subscription call).
# Prints no token. Not part of `npm test`.
export PATH="/d/n8n/nodejs:$PATH"
ROOT="${AGENTMOM_ROOT:-/d/YusufII/Projeler/agentmom}"
S=$(mktemp -d /d/Programlar/npm-tmp/e2ewf.XXXX)
cd "$S" || exit 1
mkdir repo state
( cd repo && git init -q && echo "hello" > hello.txt && git add -A && git -c user.name=t -c user.email=t@e.com commit -q -m init )
SW=$(cygpath -m "$S")
cat > user.json <<EOF
{ "policy": { "defaultContract": {
  "allowedActions": ["task.create", "file.read", "provider.call"],
  "allowedDirs": ["$SW"],
  "allowedProviders": ["codex"],
  "trustedRepos": ["$SW/repo"],
  "maxRuntimeMs": 240000,
  "approvalRequiredActions": ["file.write", "shell.exec"]
} } }
EOF
AGENTMOM_USER_CONFIG="$SW/user.json" AGENTMOM_STATE_DIR="$SW/state" node "$ROOT/src/server/main.ts" > server.log 2>&1 &
PID=$!
for i in $(seq 1 30); do curl -s http://127.0.0.1:8787/health > /dev/null && break; sleep 0.5; done
TOKEN=$(tr -d '\r\n' < "$S/state/token/session.token")
H="Authorization: Bearer $TOKEN"
J() { node "$ROOT/scripts/json-get.mjs" "$1"; }
echo "== untrusted repo is refused first (a second repo that is NOT in trustedRepos)"
mkdir other && ( cd other && git init -q && echo x > x.txt && git add -A && git -c user.name=t -c user.email=t@e.com commit -q -m i )
T0=$(curl -s -X POST http://127.0.0.1:8787/api/tasks -H "$H" -H 'content-type: application/json' -d "{\"title\":\"untrusted\",\"request\":{\"action\":\"file.read\",\"target\":\"$SW/other\"}}" | J task.id)
curl -s -X POST "http://127.0.0.1:8787/api/tasks/$T0/contract" -H "$H" -H 'content-type: application/json' -d '{"goal":"x","acceptance":[{"id":"a","text":"x"}]}' > /dev/null
curl -s -X POST "http://127.0.0.1:8787/api/tasks/$T0/workflow" -H "$H" -H 'content-type: application/json' -d "{\"repoPath\":\"$SW/other\",\"definition\":{\"steps\":[{\"role\":\"plan\",\"providerId\":\"codex\"}]}}" | J workflowId > wf0.txt
sleep 3
curl -s "http://127.0.0.1:8787/api/workflows/$(cat wf0.txt)" -H "$H" | J workflow.state; curl -s "http://127.0.0.1:8787/api/workflows/$(cat wf0.txt)" -H "$H" | J workflow.error
echo "== trusted repo: real codex plan step"
T=$(curl -s -X POST http://127.0.0.1:8787/api/tasks -H "$H" -H 'content-type: application/json' -d "{\"title\":\"wf plan\",\"request\":{\"action\":\"file.read\",\"target\":\"$SW/repo\"}}" | J task.id)
curl -s -X POST "http://127.0.0.1:8787/api/tasks/$T/contract" -H "$H" -H 'content-type: application/json' -d '{"goal":"Reply with exactly the single word pong and nothing else. Do not run commands or modify files.","acceptance":[{"id":"pong","text":"the reply is the word pong"}]}' > /dev/null
WF=$(curl -s -X POST "http://127.0.0.1:8787/api/tasks/$T/workflow" -H "$H" -H 'content-type: application/json' -d "{\"repoPath\":\"$SW/repo\",\"definition\":{\"steps\":[{\"role\":\"plan\",\"providerId\":\"codex\",\"maxAttempts\":1}]}}" | J workflowId)
for i in $(seq 1 90); do
  ST=$(curl -s "http://127.0.0.1:8787/api/workflows/$WF" -H "$H" | J workflow.state)
  [ "$ST" != "pending" ] && [ "$ST" != "running" ] && break
  sleep 2
done
echo "== workflow state: $ST"
curl -s "http://127.0.0.1:8787/api/workflows/$WF" -H "$H" | J steps
echo "== task state / evidence kinds"
curl -s http://127.0.0.1:8787/api/tasks -H "$H" | J 'tasks[].state'
curl -s "http://127.0.0.1:8787/api/tasks/$T/evidence" -H "$H" | J 'evidence[].kind'
echo "== token in audit? (must be 0)"
curl -s "http://127.0.0.1:8787/api/audit?limit=500" -H "$H" | grep -c "$TOKEN"
kill $PID 2>/dev/null
echo "scratch: $S"
