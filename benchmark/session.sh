#!/bin/zsh
# Orchestrates one measurement session.
#
#   Tab A:  the sudo powermetrics command this script prints (one password prompt)
#   Tab B:  this script
#
# They are deliberately NOT nested: powermetrics needs root and must outlive
# nothing but itself, while the runner must stay unprivileged.
set -euo pipefail
cd "${0:A:h}/.."

ARM="${1:-saturated}"
SESSION="$(date +%Y-%m-%dT%H%M)-${ARM}"
OUT="out/$SESSION"
mkdir -p "$OUT/bombardier"

ROOM_TEMP_C="${ROOM_TEMP_C:-22}" energy/preflight.sh "$OUT" || {
	print "preflight failed — refusing to start"
	exit 1
}

# -n 12000 at 500ms = 100 minutes, then it self-terminates. That matters:
# `sudo kill` would need a second password once the 5-minute timestamp expires.
print ""
print "Run this in another terminal tab, then press return here:"
print ""
print "  sudo powermetrics -i 500 -n 12000 -s cpu_power,thermal --show-plimits \\"
print "    -a 0 -f plist -b 0 -o $PWD/$OUT/power.plist --handle-invalid-values"
print ""
read -r

case "$ARM" in
	saturated) EXTRA=() ;;
	fixed)     EXTRA=(--rps 40000 --rounds 2) ;;
	*)         print "unknown arm: $ARM"; exit 1 ;;
esac

# AC sleep timer on this machine is 1 minute; an unattended run without
# caffeinate loses ~39% on every measurement after the wake.
exec caffeinate -dimsu bun energy/runner.ts --out "$OUT" --arm "$ARM" "${EXTRA[@]}"
