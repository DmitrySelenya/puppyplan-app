# Expo Agent Toolchain

PuppyPlan uses four complementary automation layers:

| Layer | Use it for |
| --- | --- |
| Expo MCP | Current Expo documentation, dependency guidance, Router inspection, local simulator screenshots/taps/logs, and read-only EAS investigation |
| `agent-device` | Cross-platform device control, accessibility snapshots, logs, network, performance, recordings, React Native internals, and physical-device workflows |
| XcodeBuildMCP | Native iOS builds, simulator launch, Xcode logs, LLDB, and Apple-platform diagnostics |
| Maestro | Durable ID-based MVP smoke flows after an installable app exists |

## MCP wiring per client

`.mcp.json` in the repo root declares the project-scoped MCP servers so every client on this machine
sees the same set. It is gitignored as local agent state, so each machine wires its own copy from
this table:

| Server | Transport | Notes |
| --- | --- | --- |
| `expo` | HTTP `https://mcp.expo.dev/mcp` | OAuth. Sign in once per client with `/mcp` (Claude Code) or the client's MCP login flow. A freshly signed-in client sees 24 remote tools; a client that authorized mid-session picks them up only after a restart. |
| `agent-device` | stdio `agent-device mcp` | 55 tools. The CLI is usually the cheaper path; disable the server if its tool surface crowds the context. |
| `maestro` | stdio `${HOME}/.maestro/bin/maestro mcp` | 14 tools, including `check_flow_syntax` and `run_flow_files` for `.maestro/`. |

```json
{
  "mcpServers": {
    "expo": { "type": "http", "url": "https://mcp.expo.dev/mcp" },
    "agent-device": { "command": "agent-device", "args": ["mcp"] },
    "maestro": { "command": "${HOME}/.maestro/bin/maestro", "args": ["mcp"] }
  }
}
```

Claude Code asks for approval the first time it reads `.mcp.json`; Codex keeps the same three
servers in its own global config. Codex reads `mcp_servers` (snake_case) only — a `[mcpServers.*]`
table in `~/.codex/config.toml` is silently ignored, so never park a server definition or a token
there. For an HTTP server that needs a token, use `bearer_token_env_var`, not an inline
`Authorization` header.

Local Expo capabilities (simulator screenshots, taps, router sitemap, logs) are proxied through the
remote Expo server, so they appear only while a local dev server started with
`EXPO_UNSTABLE_MCP_SERVER=1` is connected, and only one dev server at a time.

The remote surface verified on 2026-07-26 was documentation (`read_documentation`, `learn`,
`add_library`), EAS build and workflow tools, and store tools — no `search_documentation` on this
account's plan. Nine of the 24 mutate something outside this repo: `build_run`, `build_submit`,
`build_cancel`, `workflow_create`, `workflow_run`, `workflow_cancel`, `appstore_reply_review`,
`appstore_delete_review_response`, `playstore_reply_review`. Read the release guardrail below before
touching any of them.

## Local Expo MCP

Start the local Expo server with:

```sh
npm run start:mcp
```

or use the Codex action **Run with Expo MCP**. Expo local MCP data is proxied through Expo's remote
MCP server, so use synthetic development data only. Restart or reconnect the Expo MCP client after
restarting Metro so its local capabilities refresh.

## Device rules

- iOS simulator work uses only the approved primary or fallback SE UUID from `AGENTS.md`.
- `PUPPYPLAN_IOS_SIMULATOR_UDID` is an allowlisted selector for those two UUIDs, not an arbitrary
  device override.
- `scripts/build_and_run.sh --ios` refuses to continue while another simulator is booted.
- Android runs require exactly one explicitly connected target; the script never creates or selects
  one automatically.
- Keep one simulator/emulator and one Metro process active at a time.
- Before using `agent-device`, run `agent-device --version` and read the smallest relevant
  version-matched help topic, usually `agent-device help workflow`, `help validate`, or
  `help manual-qa`.
- Stop retained agent-device runners with `agent-device daemon stop --clean` after tooling-only
  diagnostics or when handing device ownership to another tool.

## Release guardrail

The connected Expo MCP can expose write tools for EAS builds, workflows, submissions, and public
store replies. Their availability is not authorization. Never run an EAS build/update/submit,
TestFlight/Play action, store reply, production mutation, or release action without the owner's
separate exact approval for that action.

`eas.json` intentionally has no `production` build profile, and every present build profile must
declare `"distribution": "internal"` explicitly. The repository gate rejects custom-named store
profiles, implicit store distribution, submit configuration, update channels, and `updates` in the
fully resolved Expo config. This keeps store builds and OTA fail-closed until PuppyPlan has
project-scoped production variables and the owner separately approves the production configuration
and exact build action. Do not point a production profile at the development or preview EAS
environment.

`expo-dev-client` is development tooling. Expo excludes it from release builds, so its direct
dependency does not ship the development launcher in App Store or Play Store binaries.
