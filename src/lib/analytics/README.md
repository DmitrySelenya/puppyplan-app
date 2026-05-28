# Analytics

Privacy-safe analytics wrappers live here.

Rules:
- emit analytics only through the typed wrapper in `index.ts`;
- validate every Quick Log event through `src/contracts/analytics.ts`;
- keep provider SDK wiring out of feature code;
- do not enable autocapture or session replay in MVP;
- do not include raw puppy names, notes, emails, provider names, media URLs, invite/share tokens, push tokens, raw IDs, or raw backend errors.
