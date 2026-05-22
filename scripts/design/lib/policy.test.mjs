import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  forbiddenTextPatterns,
  isAllowedEmailPlaceholder,
  textPolicyRoots,
} from "./policy.mjs";

test("textPolicyRoots includes root product and string documents", () => {
  const roots = textPolicyRoots("/repo").map((root) => root.path);

  assert.deepEqual(roots, [
    "/repo/docs/design/v1",
    "/repo/DESIGN.md",
    "/repo/puppyplan-prd-v2.md",
    "/repo/STRINGS.en.json",
    "/repo/STRINGS.ru.json",
    "/repo/STRINGS.es.json",
  ]);
});

test("forbiddenTextPatterns reject legacy persona and timing examples", () => {
  const text =
    "Olya fed Luna, Sarah fostered a puppy, Сара волонтёр, Оля покормила Бублика, Ирине нужен dashboard, a 12-min duplicate warning stayed behind, Caregiver A logged a feeding 4 minutes ago, and Опекун A отметила кормление 4 минуты назад.";
  const matches = forbiddenTextPatterns.flatMap(({ pattern }) => {
    pattern.lastIndex = 0;
    return [...text.matchAll(pattern)].map((match) => match[0]);
  });

  assert.deepEqual(matches, [
    "Olya",
    "Luna",
    "Sarah",
    "Сара",
    "Оля",
    "Бублика",
    "Ирине",
    "12-min",
    "Caregiver A logged a feeding 4 minutes ago",
    "Опекун A отметила кормление 4 минуты назад",
  ]);
});

test("isAllowedEmailPlaceholder rejects non-example test domains", () => {
  assert.equal(isAllowedEmailPlaceholder("support@puppyplan.app"), true);
  assert.equal(isAllowedEmailPlaceholder("caregiver-a@example.test"), true);
  assert.equal(isAllowedEmailPlaceholder("trainer@example.com"), false);
});

test("manifest extraction does not carry stale duplicate-window branch literals", () => {
  const source = readFileSync(new URL("../extract-artboards.mjs", import.meta.url), "utf8");

  assert.equal(source.includes("12-min"), false);
  assert.equal(source.includes("12-minute"), false);
});
