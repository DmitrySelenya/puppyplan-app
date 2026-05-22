# i18n

PUP-2 only wires EN/RU/ES shell resources into `react-i18next` and keeps English as the startup locale.

Locale detection, persisted user choice, typed-key generation, missing-key failures, and string-budget checks are owned by PUP-4/PUP-7. Do not ship product flows from this scaffold without replacing the hardcoded startup locale in `index.ts`.
