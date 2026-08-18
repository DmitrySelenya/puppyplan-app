#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-start}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_PRIMARY_SE_UDID="5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6"
IOS_FALLBACK_SE_UDID="1319D7E1-AE4E-4165-8EB9-B3A78DE62867"
IOS_SE_UDID="$(
  printf '%s' "${PUPPYPLAN_IOS_SIMULATOR_UDID:-$IOS_PRIMARY_SE_UDID}" |
    tr '[:lower:]' '[:upper:]'
)"
ANDROID_TARGET_SERIAL=""

cd "$ROOT_DIR"

show_usage() {
  cat <<'USAGE'
usage: ./scripts/build_and_run.sh [mode]

Modes:
  start, run                  Start the Expo dev server
  --mcp, mcp                  Start Expo with local Expo MCP capabilities
  --ios, ios                  Start Expo on the approved PuppyPlan iPhone SE
  --android, android          Start Expo on the single connected Android target
  --web, web                  Start Expo for web
  --dev-client, dev-client    Start Expo in development-client mode
  --dev-client-mcp            Start the development client with Expo MCP enabled
  --tunnel, tunnel            Start Expo using tunnel transport
  --export-web, export-web    Export the web build locally
  --doctor, doctor            Run Expo diagnostics
  --maestro-ios, maestro-ios [flow]
                              Run a .maestro/<flow>.yaml on the approved iOS simulator
                              (defaults to .maestro/smoke.yaml)
  --maestro-android, maestro-android [flow]
                              Run a .maestro/<flow>.yaml on the single Android target
                              (defaults to .maestro/smoke.yaml)
  --help, help                Show this help

Environment:
  PUPPYPLAN_IOS_SIMULATOR_UDID
                              Select the approved primary or fallback iPhone SE UUID
USAGE
}

run_expo() {
  local expo_bin="$ROOT_DIR/node_modules/.bin/expo"

  if [[ ! -x "$expo_bin" ]]; then
    echo "Local Expo CLI is unavailable. Run 'npm ci' to restore locked dependencies." >&2
    exit 1
  fi

  exec "$expo_bin" "$@"
}

run_doctor() {
  local doctor_bin="$ROOT_DIR/node_modules/.bin/expo-doctor"

  if [[ ! -x "$doctor_bin" ]]; then
    echo "Local Expo Doctor is unavailable. Run 'npm ci' to restore locked dependencies." >&2
    exit 1
  fi

  exec "$doctor_bin"
}

prepare_ios_se() {
  if [[ "$IOS_SE_UDID" != "$IOS_PRIMARY_SE_UDID" && "$IOS_SE_UDID" != "$IOS_FALLBACK_SE_UDID" ]]; then
    echo "Approved iOS simulator UUIDs are the primary $IOS_PRIMARY_SE_UDID and fallback $IOS_FALLBACK_SE_UDID." >&2
    exit 1
  fi

  if ! xcrun simctl list devices available | grep -Fiq "$IOS_SE_UDID"; then
    echo "Approved iOS simulator $IOS_SE_UDID is unavailable." >&2
    exit 1
  fi

  local other_booted
  other_booted="$(
    xcrun simctl list devices booted |
      grep -Eo '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}' |
      grep -Fiv "$IOS_SE_UDID" || true
  )"

  if [[ -n "$other_booted" ]]; then
    echo "Another iOS simulator is already booted: $other_booted" >&2
    echo "Shut it down explicitly before running PuppyPlan; this script never auto-selects or stops devices." >&2
    exit 1
  fi

  if ! xcrun simctl list devices booted | grep -Fiq "$IOS_SE_UDID"; then
    xcrun simctl boot "$IOS_SE_UDID"
  fi

  xcrun simctl bootstatus "$IOS_SE_UDID" -b
  open -a Simulator --args -CurrentDeviceUDID "$IOS_SE_UDID"
}

require_single_android_target() {
  if ! command -v adb >/dev/null 2>&1; then
    echo "adb is unavailable. Install Android SDK Platform Tools first." >&2
    exit 1
  fi

  local usable_targets
  local target_count
  usable_targets="$(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')"
  target_count="$(printf '%s\n' "$usable_targets" | awk 'NF { count += 1 } END { print count + 0 }')"

  if [[ "$target_count" -ne 1 ]]; then
    echo "Expected exactly one connected Android emulator/device, found $target_count." >&2
    echo "This script never creates or auto-selects an Android target." >&2
    exit 1
  fi

  ANDROID_TARGET_SERIAL="$usable_targets"
}

require_maestro() {
  if ! command -v maestro >/dev/null 2>&1; then
    echo "Maestro is unavailable. Install the approved Maestro CLI before running smoke tests." >&2
    exit 1
  fi
}

MAESTRO_FLOW=""

resolve_maestro_flow() {
  local flow="${1:-.maestro/smoke.yaml}"

  if [[ "$flow" == *".."* || "$flow" != ".maestro/"*".yaml" ]]; then
    echo "Maestro flows must be repository paths of the form .maestro/<flow>.yaml, got: $flow" >&2
    exit 1
  fi

  if [[ ! -f "$flow" ]]; then
    echo "Maestro flow not found: $flow" >&2
    exit 1
  fi

  MAESTRO_FLOW="$flow"
}

case "$MODE" in
  start|run)
    run_expo start
    ;;
  --mcp|mcp)
    export EXPO_UNSTABLE_MCP_SERVER=1
    run_expo start
    ;;
  --ios|ios)
    prepare_ios_se
    run_expo start --ios
    ;;
  --android|android)
    require_single_android_target
    run_expo start --android
    ;;
  --web|web)
    run_expo start --web
    ;;
  --dev-client|dev-client)
    run_expo start --dev-client
    ;;
  --dev-client-mcp)
    export EXPO_UNSTABLE_MCP_SERVER=1
    run_expo start --dev-client
    ;;
  --tunnel|tunnel)
    run_expo start --tunnel
    ;;
  --export-web|export-web)
    run_expo export --platform web
    ;;
  --doctor|doctor)
    run_doctor
    ;;
  --maestro-ios|maestro-ios)
    resolve_maestro_flow "${2:-}"
    prepare_ios_se
    require_maestro
    exec maestro test --device "$IOS_SE_UDID" \
      -e MAESTRO_APP_ID=com.dmitry-selenya.puppyplan-app "$MAESTRO_FLOW"
    ;;
  --maestro-android|maestro-android)
    resolve_maestro_flow "${2:-}"
    require_single_android_target
    require_maestro
    exec maestro test --device "$ANDROID_TARGET_SERIAL" \
      -e MAESTRO_APP_ID=com.dmitry_selenya.puppyplan_app "$MAESTRO_FLOW"
    ;;
  --help|help)
    show_usage
    ;;
  *)
    show_usage >&2
    exit 2
    ;;
esac
