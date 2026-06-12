# AI Agent Guide

## Operating Rule

Agents write most of the code, so architecture must be enforced by files, types, lint, tests, and CI rather than memory.

Operational workflow lives in `docs/agents/00-operating-model.md`, Linear rules live in `docs/agents/linear-workflow.md`, context packet rules live in `docs/agents/context-engineering.md`, and reusable project skills live in `.agents/skills/`.

## Before Coding

An agent must read:

1. relevant PRD section;
2. relevant DESIGN section;
3. relevant `docs/architecture/*.md`;
4. related ADRs;
5. relevant Linear `PUP-___` issue or explicit no-Linear exception;
6. relevant `.agents/skills/<name>/SKILL.md` workflow when planning, implementing, reviewing, deep-reviewing, or using TDD;
7. feature `AGENTS.md` once it exists.

## Contracts First

Before implementing a feature that changes data shape:

1. update Zod contract;
2. update database migration if needed;
3. update generated DB types;
4. add contract tests;
5. update ADR if decision changes architecture.

## Prohibited Patterns

- raw Supabase client in UI feature code;
- cross-feature imports;
- server state in Zustand;
- raw string literals in UI;
- direct `Pressable` in features;
- direct `Haptics.*` in features;
- direct `Sentry.captureException` in features;
- `any`, `as unknown as`, or `ts-ignore` without ADR;
- changing generated `ios/` or `android/` directly.

## Known Platform Caveats

Expo/RN debug or dev-client logs may include duplicate `RCTSwiftUI*` class warnings and generated UIApplication background delegate warnings for missing `UIBackgroundModes`. Treat these as a tracked platform caveat, not an app-owned blocker, unless a release-like native audit proves they reproduce in a releasable build or app-owned Expo config/dependencies require the capability.

Do not add false `UIBackgroundModes` only to silence logs. If background execution becomes product scope, declare only the real required modes through `app.config.ts` or an approved config plugin.

## PR Checklist

Every PR must answer:

- Which architecture file/ADR did this follow?
- Did contracts change?
- Did schema change?
- Did RLS tests change?
- Did i18n keys change?
- Did a diagram need updating?
- Did platform privacy/compliance declarations change?
- Did performance budgets or screen states change?

## Review Checklist

Review for:

- RLS impact;
- PII/logging leaks;
- contract drift;
- query key/invalidation correctness;
- Quick Log queue correctness;
- accessibility labels and touch targets;
- string budget and Dynamic Type;
- platform submission risk.
