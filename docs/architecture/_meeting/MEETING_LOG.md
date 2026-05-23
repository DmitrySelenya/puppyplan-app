# Architecture Council Meeting Log

## Inputs

- `puppyplan-prd-v2.md`
- `DESIGN.md`
- `design-tokens.json`
- `STRINGS.en.json`
- `STRINGS.ru.json`
- historical design audit notes (superseded; file removed)
- `_meeting/positions/*.md`
- `_meeting/critiques/*.md`
- `_meeting/REVIEW_REPORT.md`
- `diagrams/*.mmd`

## Participants

- CTO: Алекс
- UX/UI Lead: Мира
- iOS Architect: Тарас
- Android Architect: Android Lead
- Lead Client Developer: Костя
- Lead Backend Developer: Денис

## Meeting Result

The council accepted the core architecture from the prior discussion but rejected the single-file format and unilateral schema changes. Final documentation is now multi-file under `docs/architecture/`.

## Main Decisions

- Multi-file architecture docs.
- PRD data model stays intact.
- Share privacy through projections/RLS, not table splits.
- Expo SQLite queue.
- React-i18next typed i18n.
- OTA off.
- App Store and Play Store gates are P0.
- `_dev/components` inventory in MVP.
- RLS, a11y, platform, performance, and privacy checks are merge/release gates.

## Follow-Up Work

- Implement repo scaffold.
- Create app config and EAS profiles.
- Add Supabase migrations and pgTAP tests.
- Add design-system primitives.
- Add CI gates from `17-testing-ci-release.md`.
- Run `greenlight preflight .` until no critical iOS findings remain.
