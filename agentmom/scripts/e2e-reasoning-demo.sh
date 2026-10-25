#!/bin/bash
# AgentMom Faz 7: REAL small run of the decision / assumption-debt ledger over decisions and measurements from this project (no model, no network).
# Owner: Claude [IP:AgentMom Faz 7]. Prints no token. Not part of `npm test`. Uses an isolated state dir (nothing persists into real project data).
export PATH="/d/n8n/nodejs:$PATH"
ROOT="${AGENTMOM_ROOT:-/d/YusufII/Projeler/agentmom}"
OUT="${1:-/d/YusufII/Projeler/agentmom-state/reasoning-run-$(date +%H%M%S)}"
mkdir -p "$OUT"; cd "$OUT" || exit 1
AGENTMOM_USER_CONFIG="D:/YusufII/Projeler/agentmom-config/user-config.json" AGENTMOM_STATE_DIR="D:/YusufII/Projeler/agentmom-state/reasoning" node "$ROOT/src/server/main.ts" > server.log 2>&1 &
PID=$!
for i in $(seq 1 40); do curl -s http://127.0.0.1:8787/health > /dev/null && break; sleep 0.5; done
TOKEN=$(tr -d '\r\n' < "/d/YusufII/Projeler/agentmom-state/reasoning/token/session.token")
H="Authorization: Bearer $TOKEN"; B=http://127.0.0.1:8787
post() { curl -s -X POST "$B$1" -H "$H" -H 'content-type: application/json' -d "$2"; }
d30=$(node -e 'console.log(new Date(Date.now()+30*864e5).toISOString())'); d3=$(node -e 'console.log(new Date(Date.now()+3*864e5).toISOString())'); d90=$(node -e 'console.log(new Date(Date.now()+90*864e5).toISOString())')
id() { node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(d.decision.id)'; }
echo "== recording real decisions (user) with the assumptions they rest on"
D1=$(post /api/decisions "{\"title\":\"Docker bilincli ertelendi\",\"rationale\":\"Yusuf 2026-10-21: yerel D: calismasi bozulmasin; yalitim Node izin modeli + git worktree ile.\",\"scope\":\"agentmom\",\"expiresAt\":\"$d90\",\"assumptions\":[{\"text\":\"Node izin modeli ve worktree yerel dogrulama icin yeterli\",\"checkBy\":\"$d30\"}]}" | id)
D2=$(post /api/decisions "{\"title\":\"Gemini beklemede, yurutme kapali\",\"rationale\":\"Google bireysel hesapta istemciyi kapatti (UNSUPPORTED_CLIENT). Kapsam Claude ve Codex ile surer.\",\"scope\":\"agentmom\",\"expiresAt\":\"$d90\",\"assumptions\":[{\"text\":\"Claude ve Codex Gemini olmadan yeterli kapsam saglar\",\"checkBy\":\"$d30\"}]}" | id)
D3=$(post /api/decisions "{\"title\":\"Codex elevated sandbox kuruldu\",\"rationale\":\"Yusuf 18:43 onayladi; D:\\\\Arsiv kalan okuma riski kabul edildi.\",\"scope\":\"agentmom\",\"expiresAt\":\"$d90\",\"assumptions\":[{\"text\":\"Elevated sandbox yazma kapsamini yalniz Projeler ile sinirlar\",\"checkBy\":\"$d3\"},{\"text\":\"Sandbox hesabi anahtarlar klasorunu okuyamaz\",\"checkBy\":\"$d3\"}]}" | id)
D4=$(post /api/decisions "{\"title\":\"Tek yapay zeka inceleyicisine guvenilmez; testler karar verici\",\"rationale\":\"Faz 5 gercek denemesi: Codex ilk turda yanlis pozitif verdi, ayni dosyayi sonra onayladi.\",\"scope\":\"agentmom\",\"expiresAt\":\"$d90\",\"assumptions\":[{\"text\":\"Codex incelemesi ayni girdide kararli sonuc verir\",\"checkBy\":\"$d3\"}]}" | id)
echo "$D1 $D2 $D3 $D4" > ids.txt
echo "== recording real MEASUREMENTS as evidence against assumptions (recorded through the user token; the unit tests prove an agent token can only report BROKEN)"
dec() { curl -s "$B/api/decisions/$1" -H "$H"; }
aid() { dec "$1" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(d.decision.assumptions['"$2"'].id)'; }
post "/api/assumptions/$(aid $D3 0)" '{"status":"broken","evidence":"Olcum 18:45: Codex CodexSandboxUsers icin D:\\YusufII kokunde Modify verdi (Projeler ile sinirli degil)."}' > /dev/null
post "/api/assumptions/$(aid $D3 1)" '{"status":"holds","evidence":"verify-codex-sandbox.ts elevated: anahtarlar klasoru Erisim engellendi (kurulumdan once de engelliydi)."}' > /dev/null
post "/api/assumptions/$(aid $D4 0)" '{"status":"broken","evidence":"Faz 5: ayni dosya (blob 5be671d) turda reddedildi, sonraki turda onaylandi."}' > /dev/null
echo "== decisions and their review state"
curl -s "$B/api/decisions" -H "$H" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));for(const x of d.decisions)console.log(x.reviewState.padEnd(10),x.title,"|",x.assumptions.map(a=>a.status).join(","),"|",x.reviewReasons.join("; "))'
echo "== assumption debt (worst first)"
curl -s "$B/api/assumption-debt" -H "$H" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));for(const x of d.debt)console.log(x.kind.padEnd(8),x.status.padEnd(12),x.decisionTitle,"->",x.text)'
echo "== calibration report with no predictions yet (must say insufficient data, not 'good')"
curl -s "$B/api/calibration" -H "$H" | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8")).report;console.log(r.verdict,"|",r.note)'
grep -c "$TOKEN" server.log
kill $PID 2>/dev/null
echo "outputs in: $OUT"
