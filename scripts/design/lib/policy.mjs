import { join } from "node:path";

export const textFileExtensions = new Set([
  ".css",
  ".html",
  ".json",
  ".jsx",
  ".md",
]);

export const allowedEmails = new Set(["support@puppyplan.app"]);

export function isAllowedEmailPlaceholder(email) {
  const normalized = email.toLowerCase();
  return allowedEmails.has(normalized) || normalized.endsWith("@example.test");
}

// Canonical synthetic identities in product/design docs: Owner A-F,
// Caregiver A/B, Sitter A, Trainer A, Puppy A, and generic volunteer roles.
export const forbiddenTextPatterns = [
  {
    pattern: /\b(?:Olya|Dmitry|Luna|Bublik|Sarah|Sara)\b/g,
    reason: "use synthetic role/puppy placeholders instead of personal names",
  },
  {
    pattern:
      /(?:Аня|Марк|Оля|Оли|Лена|Ирина|Томаш|Сара|Сары|Саре|Сару|Сарой|Дмитрия|Дмитрию|Дмитрий|Луна|Луну|Бублика|Бублику|Бублик|Марина)/g,
    reason: "use synthetic role/puppy placeholders instead of personal names",
  },
  {
    pattern: /Kind Hands Clinic|Mild swelling at injection site/g,
    reason: "use synthetic provider/note placeholders",
  },
  {
    pattern: /12-min|12 minutes|12 минут|12-минут|duplicate-warning-window-min/g,
    reason: "duplicate-warning contract is 60 seconds",
  },
  {
    pattern: /Caregiver A logged a feeding 4 minutes ago/g,
    reason: "duplicate-warning examples must stay inside the 60-second contract",
  },
  {
    pattern: /Опекун A отметила кормление 4 минуты назад/g,
    reason: "duplicate-warning examples must stay inside the 60-second contract",
  },
];

export function textPolicyRoots(repoRoot) {
  return [
    {
      path: join(repoRoot, "docs/design/v1"),
      label: "design handoff package",
    },
    {
      path: join(repoRoot, "DESIGN.md"),
      label: "root design contract",
    },
    {
      path: join(repoRoot, "puppyplan-prd-v2.md"),
      label: "root PRD",
    },
    {
      path: join(repoRoot, "STRINGS.en.json"),
      label: "root English strings",
    },
    {
      path: join(repoRoot, "STRINGS.ru.json"),
      label: "root Russian strings",
    },
    {
      path: join(repoRoot, "STRINGS.es.json"),
      label: "root Spanish strings",
    },
  ];
}
