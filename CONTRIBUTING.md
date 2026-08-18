# Contributing

Thanks for looking. Some honest framing before you invest time.

**This is a product repository, not a community project.** PuppyPlan is a commercial app
developed in the open. The source is published so the engineering and the AI-agent delivery
process can be read, studied, and learned from — under the
[PolyForm Noncommercial License](LICENSE), which permits noncommercial use and forbids
shipping it commercially.

Roadmap decisions are made by the maintainer. That means a well-argued issue is usually worth
more here than an unsolicited large PR.

## What is genuinely welcome

- **Security reports** — see [SECURITY.md](SECURITY.md). Report privately, never as a public issue.
- **Bug reports** with reproduction steps.
- **Small, self-contained fixes** — a broken link, a wrong type, a flaky test, a typo.
- **Questions about the architecture or the agent workflow.** If a document failed to explain
  itself, that is a real defect in a repo whose entire premise is that the docs are the interface.

## What to discuss before writing code

Open an issue first for anything that touches:

- data shapes, migrations, or Row Level Security;
- navigation structure or screen layout;
- new dependencies;
- anything larger than roughly a hundred lines.

A PR that arrives without that conversation is likely to be declined on scope, no matter how
good the code is. That is a statement about the process, not about your work.

## Ground Rules

The rules that govern this codebase live in [`AGENTS.md`](AGENTS.md) — they apply identically to
humans and to AI agents. [`docs/INDEX.md`](docs/INDEX.md) routes you to the docs relevant to a
given task type. The short version:

- Keep `app/` thin: routes, layouts, providers, redirects, modal presentation only.
- Reach Supabase through `src/lib/supabase` / `src/lib/query` — never a raw client in feature UI.
- TanStack Query owns server state; Zustand owns UI/workflow state only.
- Data-shape changes start in `src/contracts/`, then migrations, generated types, RLS tests, docs.
- Every user-facing string is a typed i18n key. No literals in UI.
- Feature code uses `src/design` primitives — not raw `Pressable`, colors, spacing, or haptics.
- Never commit generated `ios/` or `android/` files.
- Never log or document raw user data. See [SECURITY.md](SECURITY.md).

## Before You Open a PR

Run the full local gate. It must be green:

```bash
npm run check
```

That is lint, typecheck, unit tests, Node tests, and the scaffold gates — navigation contract,
i18n coverage and string budgets, design-token drift, privacy scan, text hygiene, plan index,
and release fail-closed checks. CI runs the same gate; running it locally first saves a round trip.

Write or update tests alongside the behavior change, not after it.

## Local Setup

See [Quick start](README.md#quick-start) in the README. Note that the app builds and the full
gate passes without any backend credentials; only the Supabase helper scripts and remote schema
checks need your own project.

## Code of Conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
