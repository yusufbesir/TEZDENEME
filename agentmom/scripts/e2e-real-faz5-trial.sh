#!/bin/bash
# AgentMom Faz 5(a): REAL multi-step workflow trial (Claude Code plan+implement, Codex independent review, Beyin Verify with human-written trusted tests).
# Owner: Claude [IP:AgentMom Faz 5]. Uses subscription quota (about 3 model calls). Prints no token. Not part of `npm test`.
# Target repo: D:\YusufII\Projeler\agentmom-deneme (stub + trusted tests committed). Uses the user config in ../agentmom-config.
export PATH="/d/n8n/nodejs:$PATH"
ROOT="${AGENTMOM_ROOT:-/d/YusufII/Projeler/agentmom}"
REPO="D:/YusufII/Projeler/agentmom-deneme"
OUT="${1:-/d/YusufII/Projeler/agentmom-state/faz5-run-$(date +%H%M%S)}"
mkdir -p "$OUT"
cd "$OUT" || exit 1
AGENTMOM_USER_CONFIG="D:/YusufII/Projeler/agentmom-config/user-config.json" AGENTMOM_STATE_DIR="D:/YusufII/Projeler/agentmom-state/faz5" node "$ROOT/src/server/main.ts" > server.log 2>&1 &
PID=$!
for i in $(seq 1 40); do curl -s http://127.0.0.1:8787/health > /dev/null && break; sleep 0.5; done
TOKEN=$(tr -d '\r\n' < "/d/YusufII/Projeler/agentmom-state/faz5/token/session.token")
H="Authorization: Bearer $TOKEN"
J() { node "$ROOT/scripts/json-get.mjs" "$1"; }
B=http://127.0.0.1:8787
echo "== create task (file.write needs user approval) and approve as the user"
T=$(curl -s -X POST $B/api/tasks -H "$H" -H 'content-type: application/json' -d "{\"title\":\"slugify trial\",\"request\":{\"action\":\"file.write\",\"target\":\"$REPO\"}}" | J task.id)
curl -s -X POST "$B/api/tasks/$T/approve" -H "$H" -H 'content-type: application/json' -d '{}' | J task.state
curl -s -X POST "$B/api/tasks/$T/contract" -H "$H" -H 'content-type: application/json' -d '{
  "goal":"Implement slugify(text) in src/slugify.ts (replace the stub) so that the committed tests in slugify.test.ts pass. Rules: lowercase; transliterate Turkish letters (ç ğ ı i̇ ö ş ü, also capital İ) to ASCII; every run of other non-alphanumeric characters becomes ONE hyphen; no leading or trailing hyphen; empty result stays an empty string. Edit only files under src/. Do not touch slugify.test.ts.",
  "acceptance":[
    {"id":"c1","text":"lowercases and joins words with single hyphens"},
    {"id":"c2","text":"trims separators and drops punctuation"},
    {"id":"c3","text":"transliterates Turkish letters to ASCII"},
    {"id":"c4","text":"returns an empty string when nothing usable remains"}],
  "writeScopes":["src"],
  "constraints":["no new dependencies","do not modify any test file"],
  "verification":{"localTests":{"files":["slugify.test.ts"]},"requireTrustedTests":true,"timeoutMs":120000}
}' | J contract.goal | head -c 80; echo
WF=$(curl -s -X POST "$B/api/tasks/$T/workflow" -H "$H" -H 'content-type: application/json' -d "{\"repoPath\":\"$REPO\",\"definition\":{\"steps\":[
  {\"role\":\"plan\",\"providerId\":\"claude-code\",\"maxAttempts\":1},
  {\"role\":\"implement\",\"providerId\":\"claude-code\",\"maxAttempts\":2},
  {\"role\":\"review\",\"providerId\":\"codex\",\"maxAttempts\":1},
  {\"role\":\"verify\"}]}}" | J workflowId)
echo "workflow: $WF"
echo "$WF" > wf.id; echo "$T" > task.id
for i in $(seq 1 240); do
  ST=$(curl -s "$B/api/workflows/$WF" -H "$H" | J workflow.state)
  [ "$ST" != "pending" ] && [ "$ST" != "running" ] && break
  sleep 3
done
echo "== workflow state: $ST"
curl -s "$B/api/workflows/$WF" -H "$H" > wf.json
curl -s "$B/api/tasks/$T/evidence" -H "$H" > evidence.json
curl -s "$B/api/tasks/$T/delivery" -H "$H" > delivery.json
curl -s "$B/api/audit?limit=500" -H "$H" > audit.json
echo "== token in saved outputs? (must be 0)"
grep -c "$TOKEN" wf.json evidence.json delivery.json audit.json server.log
kill $PID 2>/dev/null
echo "outputs in: $OUT"
