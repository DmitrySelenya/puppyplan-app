# PuppyPlan Maestro flows

These flows verify the already-installed, authenticated PuppyPlan shell. They intentionally keep app
state so they never store credentials or private fixture data in the repository.

| Flow | Covers |
| --- | --- |
| `smoke.yaml` | App launches into the Diary shell (`diary-header`, `nav-add`). |
| `quick-log.yaml` | The add-record entry point: `+` opens the sheet, Quick Log opens the tracker grid, dismiss returns to Diary. Read-only, writes no record. |

Prerequisites:

- use synthetic development data only;
- install PuppyPlan before running the flow;
- finish sign-in and onboarding once on the target;
- for iOS, boot only `Grith iPhone SE 3 iOS 26.3`
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`);
- for Android, connect exactly one explicitly chosen emulator or device.

Commands:

```sh
npm run maestro:smoke:ios
npm run maestro:quick-log:ios
```

Both wrapper modes accept any `.maestro/<flow>.yaml` as an optional argument and refuse paths
outside this directory. No flow runs an EAS build, clears application state, logs in, creates
product records, or publishes artifacts.

## Regenerating quick-log.yaml from the agent-device recording

`quick-log.ad` is the recorded agent-device session and the editable source. Replay it against the
approved simulator, then export:

```sh
agent-device replay .maestro/quick-log.ad --platform ios --device "Grith iPhone SE 3 iOS 26.3" \
  -e MAESTRO_APP_ID=com.dmitry-selenya.puppyplan-app
agent-device replay export .maestro/quick-log.ad --format maestro --out .maestro/quick-log.yaml --force
```

The first Apple run of a session pays an XCTest runner build; pre-warm it with
`agent-device prepare ios-runner --platform ios --device "Grith iPhone SE 3 iOS 26.3"`, and stop that
daemon with `agent-device daemon stop --clean` before `replay`/`test`, which start their own daemon
and otherwise collide over the runner lease.

Two hand-corrections are required after every export, both verified on 2026-07-26 against
agent-device 0.20.0 and the Maestro CLI:

- **Replace `label:` with `text:`.** The export emits `label:` selectors. `agent-device replay
  --maestro` understands them; the real Maestro CLI accepts the flow and matches nothing, so
  `assertVisible: {label: ThisStringDoesNotExist}` passes. The same assertion with `text:` fails as
  it should. A `label:` selector in a committed flow is a silently green test.
- **Do not target the Quick Log sheet by testID.** `maestro hierarchy` exposes no `resourceId` for
  the sheet's controls, so `id: quick-log-sheet-close` never matches even though agent-device finds
  it. `nav-add` and `diary-header` do resolve by id.

Re-add `name:` and `tags:` after export; the exporter does not emit them.
