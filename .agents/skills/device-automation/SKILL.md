---
name: device-automation
description: Use when driving a PuppyPlan build on a simulator, emulator, or physical device - inspecting UI, capturing evidence, reading logs/network/perf, or recording a replayable flow through agent-device, Expo MCP, or Maestro.
---

# PuppyPlan Device Automation

Canonical routing for the four automation layers described in `docs/agents/expo-toolchain.md`.
`AGENTS.md`, plan files, and exact user approvals override this skill.

## Pick the layer first

| Task | Layer |
| --- | --- |
| Accessibility tree, evidence bundle, logs/network/perf, React internals, replayable flow | `agent-device` |
| Expo docs, dependency guidance, expo-router sitemap, read-only EAS investigation | Expo MCP |
| Native iOS build, simulator launch, Xcode logs, LLDB | XcodeBuildMCP |
| Durable ID-based smoke that must run the same way twice | Maestro (`.maestro/`) |

Do not drive the same target from two layers at once. One simulator/emulator and one Metro
process at a time.

## Device rules (non-negotiable)

- iOS simulator work uses only the approved SE profile from `AGENTS.md`
  (`Grith iPhone SE 3 iOS 26.3`, `5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`). Never auto-select the
  first device from a list.
- Pass the target explicitly on every `agent-device` command: `--platform ios --device <name>`
  (a UUID is rejected here; `--device` takes the simulator name). `agent-device devices` also lists
  the owner's connected physical iPhones as booted targets, so an unqualified command can reach a
  real phone. Never target a physical device without the owner's approval for that exact device.
- Do not run `agent-device doctor` as routine prep. It has warmed an unapproved simulator before.
  Use it only when the user asks for setup diagnostics or a failure points at an unhealthy target.
- Android needs exactly one explicitly connected target; never create or select one automatically.
- Stop retained runners with `agent-device daemon stop --clean` when finishing or handing device
  ownership to another layer.
- Never run an EAS build/update/submit, store action, or other release action without the owner's
  separate approval naming that exact action.

## agent-device loop

Read the smallest version-matched help topic before the first command; the CLI is the source of
truth for command shapes, not memory:

```sh
agent-device --version
agent-device help manual-qa        # scripted acceptance pass
agent-device help validate         # verifying a code change, stale-build risk
agent-device help dogfood          # exploratory pass with evidence
agent-device help react-native     # Expo/dev-client/Metro hazards, LogBox overlays
agent-device help debugging        # logs, network, perf, traces, alerts
agent-device help workflow         # full reference fallback
```

Default loop: `open --relaunch` -> `snapshot -i` -> `press`/`fill`/`scroll --settle` -> verify from
the settled diff -> `close`. Use `--settle` on every mutating action, `diff snapshot` instead of a
full re-snapshot, and `--level digest --json` when output only feeds a check.

## PuppyPlan evidence expectations

- Structural claim ("the label is exposed", "the row renders") -> `snapshot -i`, not a screenshot.
- Visual claim ("matches the atlas") -> `screenshot` plus an eyes-on comparison; a recorded PASS
  without an opened image is not evidence. Use the `ux-audit` skill for judgement.
- Write path claim ("the record reached Supabase") -> `logs` + `network`, never "it looked fine".
- Keyboard must never auto-open on sheet/screen open -> on Android use `keyboard`; on iOS
  `keyboard` status is unsupported, so read the post-open snapshot instead.
- Maestro flow selectors stay on `text:` or `id:`. The agent-device Maestro export emits `label:`,
  which the real Maestro CLI accepts while matching nothing, so the assertion passes vacuously. See
  `.maestro/README.md`.

## Privacy

Evidence is repo-visible. Use synthetic development data only. Never commit or paste real puppy
names, notes, emails, provider names, photos, tokens, or session artifacts containing them.
Screenshots and `.ad` scripts follow the same rule as logs.

## Promoting a flow to Maestro

An `agent-device` flow that is worth running twice becomes a Maestro flow: replay it, export strict
Maestro YAML, keep only stable React Native IDs, and store it under `.maestro/`. Do not add app
state, credentials, or fixture data to the repo.
