# AI Agent Guide

## Operating Rule

Agents write most of the code, so architecture must be enforced by files, types, lint, tests, and CI rather than memory.

## Before Coding

An agent must read:

1. relevant PRD section;
2. relevant DESIGN section;
3. relevant `docs/architecture/*.md`;
4. related ADRs;
5. feature `AGENTS.md` once it exists.

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

