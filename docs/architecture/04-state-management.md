# State Management

## Ownership Matrix

| State | Owner | Examples |
|---|---|---|
| Server state | TanStack Query | events, puppy, health records, reminders, memberships |
| Durable pending Quick Log writes | Expo SQLite queue | pending local events |
| Ephemeral UI | Zustand | open sheets, snackbar queue, FAB visibility, network mirror |
| Route/deep-link state | Expo Router | `/timeline?filter=potty`, `/invite/[token]` |
| Form state | React Hook Form + Zod | puppy setup, health edit, reminder edit, share scope |
| Secrets | Expo SecureStore | Supabase session, pending deep-link intent if sensitive |
| Analytics consent/preferences | Supabase row + local mirror | notification/privacy settings |

## Zustand Rules

Allowed stores:

- `appUiStore`: snackbar queue, FAB visibility override, online/offline mirror.
- `quickLogDraftStore`: current tracker and optional detail draft.
- `pendingQueueStore`: reactive mirror of SQLite queue, not source of truth.
- small UI filter stores where URL state would be noisy.

Forbidden in Zustand:

- Timeline rows;
- event_log rows;
- household members;
- health records;
- reminders;
- share grants;
- Supabase session payload.

## Forms

All forms use React Hook Form plus Zod resolver. Form state must not be persisted unless the PRD explicitly requires it. Onboarding may keep a temporary draft before account creation.

## URL State

Use Expo Router params for:

- share/invite tokens;
- Timeline filters that should survive a back navigation;
- deep-link targets;
- share scope selection when the user should return without losing context.

