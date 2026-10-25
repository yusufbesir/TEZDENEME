#!/bin/bash
# End-to-end smoke test with the REAL codex CLI (subscription route, read-only sandbox). Prints no token.
export PATH="/d/n8n/nodejs:$PATH"
S=$(mktemp -d /d/Programlar/npm-tmp/e2e.XXXX)
cd "$S" || exit 1
mkdir repo state
( cd repo && git init -q && echo "hello" > hello.txt && git add -A && git -c user.name=t -c user.email=t@e.com commit -q -m init )
SW=$(cygpath -m "$S")
cat > user.json <<EOF
{ "policy": { "defaultContract": {
  "allowedActions": ["task.create", "file.read", "provider.call"],
  "allowedDirs": ["$SW"],
  "allowedProviders": ["codex"],
  "maxRuntimeMs": 240000,
  "approvalRequiredActions": ["file.write", "shell.exec"]
} } }
EOF
AGENTMOM_USER_CONFIG="$SW/user.json" AGENTMOM_STATE_DIR="$SW/state" node /d/YusufII/Projeler/agentmom/src/server/main.ts > server.log 2>&1 &
PID=$!
for i in $(seq 1 30); do curl -s http://127.0.0.1:8787/health > /dev/null && break; sleep 0.5; done
echo "== health"; curl -s -w ' [%{http_code}]\n' http://127.0.0.1:8787/health | cut -c1-150
TOKEN=$(tr -d '\r\n' < "$S/state/token/session.token")
H="Authorization: Bearer $TOKEN"
echo "== no token"; curl -s -w ' [%{http_code}]\n' http://127.0.0.1:8787/api/tasks
echo "== create task"
R=$(curl -s -X POST http://127.0.0.1:8787/api/tasks -H "$H" -H 'content-type: application/json' -d "{\"title\":\"e2e pong\",\"request\":{\"action\":\"file.read\",\"target\":\"$SW/repo\"}}")
echo "$R" | cut -c1-260
ID=$(echo "$R" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).task.id))')
echo "== run (codex, real)"
curl -s -w ' [%{http_code}]\n' -X POST "http://127.0.0.1:8787/api/tasks/$ID/run" -H "$H" -H 'content-type: application/json' -d "{\"providerId\":\"codex\",\"repoPath\":\"$SW/repo\",\"prompt\":\"Reply with exactly the single word: pong. Do not run any commands and do not modify files.\",\"timeoutMs\":200000}" | cut -c1-300
for i in $(seq 1 90); do
  ST=$(curl -s http://127.0.0.1:8787/api/tasks -H "$H" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=JSON.parse(s).tasks[0];console.log(t.state)})')
  [ "$ST" != "approved" ] && [ "$ST" != "running" ] && break
  sleep 2
done
echo "== final task state: $ST"
echo "== evidence kinds / summaries"
curl -s "http://127.0.0.1:8787/api/tasks/$ID/evidence" -H "$H" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const e of JSON.parse(s).evidence)console.log(e.kind,"|",e.summary)})'
echo "== audit actions"
curl -s "http://127.0.0.1:8787/api/audit?limit=60" -H "$H" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s).events.map(e=>e.action).reverse();console.log(a.join(", "))})'
echo "== token leaked into audit? (must be 0)"
curl -s "http://127.0.0.1:8787/api/audit?limit=500" -H "$H" | grep -c "$TOKEN"
echo "== codex adapter capability row"
curl -s http://127.0.0.1:8787/api/providers -H "$H" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const p of JSON.parse(s).providers){const c=p.capabilities.find(x=>x.operation==="execute");console.log(p.id,"execute=",c.status)}})'
kill $PID 2>/dev/null
echo "scratch: $S"
