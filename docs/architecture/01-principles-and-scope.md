# Principles And Scope

## Product Frame

PuppyPlan is not a generic dog app, a training library, a veterinary app, a mental-health app, or a social product. It is a calm operational companion for the first 90 days with a puppy.

The beta optimizes for:

- first useful value in under 45 seconds;
- Quick Log in 1-2 taps;
- Today as one clear next action;
- family coordination without duplicate care;
- safe scoped sharing with trainer/viewer;
- trustworthy health recordkeeping, not advice.

## MVP Scope

Must ship:

- onboarding with deferred account where possible;
- Today, Quick Log, Timeline;
- Family invite for one caregiver;
- Trusted Sitter Mode over caregiver membership;
- trainer scoped sharing and permission preview;
- local reminders and trusted-sitter completion push;
- Health Basics and starter guidance cards;
- privacy-safe analytics;
- accessibility gates.

Deferred:

- full offline-first sync;
- custom backend server;
- PDF export/background workers;
- live RevenueCat/IAP;
- AI coach;
- multi-pet/foster;
- public social/community;
- training library;
- tablet/landscape/dark mode.

## Non-Negotiables

- `Today | Health | More` are the only primary tabs.
- Quick Log is a persistent FAB/action, not a tab.
- Supabase Postgres is durable source of truth.
- Realtime is an enhancement, not a correctness dependency.
- RLS and Edge Functions enforce access; UI guards are convenience only.
- Every user-facing string comes through i18n.
- No raw puppy names, notes, emails, provider names, photos, or tokens in analytics/logs.
- Any schema change beyond PRD §6.10 requires ADR-0007 process and CTO approval.

## Duplicate Warning Rules

Two separate product rules are final:

- accidental double tap: 3 seconds;
- household duplicate-care warning: 10 minutes.

Both constants live in `contracts/business-rules.ts` and must be tested.

