#!/bin/zsh
# Read-only preflight. Writes meta.json. Non-zero exit blocks the session.
set -uo pipefail
OUT="${1:?usage: preflight.sh <outdir>}"
mkdir -p "$OUT"
FAIL=0
ok()   { print -r -- "  ok    $1" }
bad()  { print -r -- "  FAIL  $1"; FAIL=1 }
warn() { print -r -- "  warn  $1" }

print "preflight"

BATT=$(pmset -g batt)
[[ "$BATT" == *"AC Power"* ]] && ok "on AC power" || bad "not on AC power"

LPM=$(pmset -g custom 2>/dev/null | grep -i lowpowermode | head -1 | awk '{print $2}')
[[ "$LPM" == "0" ]] && ok "low power mode off" || warn "lowpowermode=$LPM"

THERM_BEFORE=$(pmset -g therm)
ok "pmset -g therm captured"

lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1 && bad "port 3000 in use" || ok "port 3000 free"

FREE_GB=$(df -g / | awk 'NR==2{print $4}')
(( FREE_GB >= 5 )) && ok "disk ${FREE_GB}GB free" || bad "only ${FREE_GB}GB free"

GIT_STATUS=$(git status --porcelain)
GIT_SHA=$(git rev-parse HEAD)
DIRTY=$(print -r -- "$GIT_STATUS" | grep -v '^?? energy/$' | grep -v '^?? out/$' | grep -v '^$')
[[ -z "$DIRTY" ]] && ok "upstream tree clean (only energy/ and out/ untracked)" \
                  || bad "upstream modified: $DIRTY"

HOT=$(ps -Ao %cpu,comm -r | awk 'NR>1 && $1>2.0' | grep -v -E 'powermetrics|caffeinate|bun|preflight|ps$' | head -5)
[[ -z "$HOT" ]] && ok "no busy background processes" || warn "busy: $(print -r -- $HOT | tr '\n' ';')"

TM=$(tmutil status 2>/dev/null | grep -c 'Running = 1')
(( TM == 0 )) && ok "Time Machine idle" || bad "Time Machine is running"

SPOTLIGHT=$(mdutil -s / 2>/dev/null | tail -1 | sed 's/^[[:space:]]*//')
ok "spotlight: $SPOTLIGHT"

BUN_V=$(bun --version)
BOMB_V=$(bombardier --version 2>&1 | head -1)
ok "bun $BUN_V / $BOMB_V"

cat > "$OUT/meta.json" <<JSON
{
  "capturedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "roomTempC": ${ROOM_TEMP_C:-22},
  "roomTempInstrument": "${ROOM_TEMP_INSTRUMENT:-room thermostat}",
  "machine": {
    "model": "$(sysctl -n hw.model)",
    "chip": "$(sysctl -n machdep.cpu.brand_string)",
    "memoryBytes": $(sysctl -n hw.memsize),
    "perflevel0": { "name": "$(sysctl -n hw.perflevel0.name)", "count": $(sysctl -n hw.perflevel0.logicalcpu) },
    "perflevel1": { "name": "$(sysctl -n hw.perflevel1.name)", "count": $(sysctl -n hw.perflevel1.logicalcpu) },
    "os": "$(sw_vers -productName) $(sw_vers -productVersion) ($(sw_vers -buildVersion))",
    "darwin": "$(uname -r)"
  },
  "tools": { "bun": "$BUN_V", "bombardier": "$BOMB_V" },
  "upstream": {
    "repo": "https://github.com/saltyaom/bun-http-framework-benchmark",
    "commit": "$GIT_SHA",
    "patched": false,
    "gitStatusPorcelain": $(print -r -- "$GIT_STATUS" | jq -Rs .)
  },
  "power": { "source": "AC", "lowPowerMode": ${LPM:-null} },
  "pmsetThermBefore": $(print -r -- "$THERM_BEFORE" | jq -Rs .),
  "spotlightBefore": "$SPOTLIGHT",
  "allChecksPassed": $( (( FAIL == 0 )) && echo true || echo false )
}
JSON

(( FAIL == 0 )) && print "preflight passed" || print "preflight FAILED"
exit $FAIL
