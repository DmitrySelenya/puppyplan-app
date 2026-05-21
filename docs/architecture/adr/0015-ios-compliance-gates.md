# ADR-0015: iOS Compliance Gates

Status: Accepted

## Context

iOS release readiness depends on privacy manifest, App Privacy answers, deep-link configuration, notification permission behavior, symbolication, account deletion, and review notes.

## Decision

Treat iOS compliance checks as P0 release gates. Required items include `PrivacyInfo.xcprivacy`, AASA validation, dSYM/source-map upload, App Privacy form alignment, account deletion path, Sign in with Apple if social auth exists, and App Review notes clarifying recordkeeping rather than veterinary diagnosis.

## Consequences

- Missing privacy manifest blocks TestFlight/App Store release.
- Dependency additions require privacy-manifest review.
- Release candidates must prove symbolicated crashes in Sentry.
