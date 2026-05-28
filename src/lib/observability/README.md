# Observability

Sentry or equivalent wrappers and PII scrubbers live here.

Feature code must not call observability SDKs directly. Report stable categories and context through the shared wrapper, which strips private keys and values before an adapter receives an event.
