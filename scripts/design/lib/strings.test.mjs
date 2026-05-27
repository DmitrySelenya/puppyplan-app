import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

function readJson(path) {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8"));
}

function getPath(value, path) {
  return path.split(".").reduce((current, key) => current?.[key], value);
}

function collectLeafStrings(value, path = []) {
  if (typeof value === "string") {
    return [{ path: path.join("."), value }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectLeafStrings(item, [...path, String(index)]));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => collectLeafStrings(item, [...path, key]));
  }

  return [];
}

function collectObjectShape(value, path = []) {
  if (Array.isArray(value)) {
    return [`${path.join(".")}:array`];
  }

  if (value && typeof value === "object") {
    const objectPath = path.length > 0 ? [`${path.join(".")}:object`] : [];
    return [
      ...objectPath,
      ...Object.keys(value)
        .sort()
        .filter((key) => key !== "$meta")
        .flatMap((key) => collectObjectShape(value[key], [...path, key])),
    ];
  }

  return [`${path.join(".")}:${typeof value}`];
}

test("localized string files match the English object-key and value-type shape", () => {
  const englishShape = collectObjectShape(readJson("STRINGS.en.json"));

  for (const localeFile of ["STRINGS.ru.json", "STRINGS.es.json"]) {
    assert.deepEqual(collectObjectShape(readJson(localeFile)), englishShape, localeFile);
  }
});

test("localized string metadata records English master provenance", () => {
  assert.equal(getPath(readJson("STRINGS.en.json"), "$meta.role"), "fallback-master");

  for (const localeFile of ["STRINGS.ru.json", "STRINGS.es.json"]) {
    const metadata = getPath(readJson(localeFile), "$meta");

    assert.equal(metadata.role, "locale", `${localeFile} should be marked as a locale file`);
    assert.equal(
      metadata.translatedFrom,
      "STRINGS.en.json",
      `${localeFile} should point back to the English master strings`,
    );
    assert.match(
      metadata.note,
      /STRINGS\.en\.json/,
      `${localeFile} note should name the English master strings`,
    );
  }
});

test("Russian activity and duplicate-warning copy use a consistent grammatical register", () => {
  const russian = readJson("STRINGS.ru.json");
  const expectedValues = new Map([
    [
      "today.activity-strip._comment-single",
      "Примеры verbForm для текущего синтетического мужского регистра: «покормил», «отметил туалет», «вернулся с прогулки»; {timeAgo} — «42 мин назад». Если actorName требует иной род, используйте согласованную форму или ICU select.",
    ],
    [
      "quick-log.duplicate-warning.body-template",
      "{actorName}: {eventType} уже отмечено {timeAgo}.",
    ],
    [
      "quick-log.duplicate-warning.body-example",
      "Опекун A: кормление уже отмечено 42 секунды назад.",
    ],
  ]);

  const mismatches = [...expectedValues].flatMap(([path, expected]) => {
    const actual = getPath(russian, path);
    return actual === expected ? [] : [`${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`];
  });

  const forbiddenPatterns = [
    [/покормила/, "activity-strip comment should not document feminine examples for masculine examples"],
    [/отметила туалет/, "activity-strip comment should not document feminine examples for masculine examples"],
    [/\{actorName\} отметила/, "duplicate warning should not use a feminine verb template with masculine examples"],
    [/Опекун A отметила/, "duplicate warning examples should not mix masculine actor labels with feminine verbs"],
  ];

  const hits = collectLeafStrings(russian).flatMap(({ path, value }) =>
    forbiddenPatterns
      .filter(([pattern]) => pattern.test(value))
      .map(([, reason]) => `${path}: ${reason}: ${JSON.stringify(value)}`),
  );

  assert.deepEqual([...mismatches, ...hits], []);
});

test("Spanish strings avoid known high-risk machine-translation regressions", () => {
  const spanish = readJson("STRINGS.es.json");
  const expectedValues = new Map([
    ["sharing.sitter.section-who", "Quién"],
    ["sharing.sitter.checklist-view.role-chip", "cuidador"],
    ["sharing.sitter.checklist-potty", "Pausas al baño"],
    ["sharing.sitter.checklist-training", "Entrenamiento"],
    ["guidance.topics.biting.title", "Morder durante el juego"],
    ["guidance.topics.crate.title", "La jaula como lugar tranquilo"],
    ["today.activity-strip._comment-single", "Spanish {verbForm} values carry required prepositions and personal-a handling, e.g. \"alimentó a\", \"registró una pausa\" or \"volvió de un paseo\". Keep {timeAgo} lowercase when the template places it after \"·\"."],
    ["today.activity-strip.example-feeding", "Cuidador A alimentó a Cachorro A · hace 42 min"],
    ["today.activity-strip.multiple", "{actorName} y tú · {n} eventos en la última hora"],
    ["today.after-feeding.primary", "Porción habitual"],
    ["quick-log.trackers.potty-outside", "Orinar afuera"],
    ["quick-log.trackers.potty-inside", "Orinar dentro"],
    ["quick-log.trackers.sleep", "Sueño"],
    ["quick-log.trackers.training", "Entrenamiento"],
    ["quick-log.trackers.play", "Juego"],
    ["quick-log.trackers.biting", "Mordidas"],
    ["more.quick-trackers.items.2", "Sueño"],
    ["more.quick-trackers.items.3", "Paseo"],
    ["more.quick-trackers.items.5", "Juego"],
    ["more.quick-trackers.items.6", "Mordidas"],
    ["quick-log.feeding.title", "Alimentado"],
    ["quick-log.feeding.primary", "Porción habitual"],
    ["quick-log.feeding.manual-unit", "porción"],
    ["quick-log.potty.context-options.0", "Después de dormir"],
    ["quick-log.potty.context-options.1", "Después de comer"],
    ["quick-log.sleep.already-slept", "Ya dormí"],
    ["quick-log.zoomies.context-default", "Después de dormir"],
    ["quick-log.snackbar.a11y", "Registrado: {trackerName}. Acción disponible: deshacer."],
    ["timeline.filter-chips.5", "Entrenamiento"],
    ["quick-log.duplicate-warning.more-matches", "{n} eventos más en los últimos 60 segundos"],
    ["sharing.family.invite.section-role", "Rol"],
    ["onboarding.welcome.cta", "Empezar"],
    ["paywall.plan-monthly", "Mensual · 8,99 €"],
    ["paywall.plan-yearly", "Anual · 49,99 € (ahorra 53%)"],
    ["paywall.states.error", "No se pudieron cargar los planes. Intenta actualizar."],
    ["paywall.states.active-until", "Suscripción activa hasta {date}. Gestionada en la App Store."],
    ["voice.approved-tone-phrases.6", "las cosas están más claras ahora"],
    ["states.empty-filtered.body", "Prueba con otro rango o borra los filtros."],
    ["states.offline-read.body", "Mostrando datos de {time}. Tus cambios se guardarán localmente."],
    ["states.permission-denied.body", "Para que esto funcione, permite el acceso a {resource} en ajustes."],
    ["states.revoked-or-expired.body", "Contacta al propietario si necesitas un nuevo acceso."],
    ["tabs.today-hint", "Abre la pantalla Hoy"],
    ["onboarding.welcome.subtitle", "Empieza con un plan claro."],
    ["onboarding.plan-reveal.hero", "Registra tu primer evento; tardará unos cinco segundos."],
    ["onboarding.plan-reveal.starter-card-1", "Observa el patrón de alimentación"],
    ["onboarding.plan-reveal.cta", "Empieza tu primer registro"],
    ["today.hero.day1", "Registra tu primer evento; tardará unos cinco segundos."],
    ["today.hero.potty-time-meta", "La última pausa fue hace {duration}."],
    ["today.recap-day2.template", "{walks} salidas afuera, {feedings} comidas. Un ritmo tranquilo para el segundo día."],
    ["today.missed-reminder-card.actions.1", "Posponer"],
    ["timeline.time.minutes-ago", "hace {n} min"],
    ["sharing.family.accepted.neutral-unavailable", "Esta invitación ya no está disponible. Pídele a {ownerName} que envíe una nueva."],
    ["sharing.trainer.accepted-view.summary-potty", "Pausas al baño: {n}"],
    ["health.edit-record.delete-confirm.body", "La entrada desaparecerá de tu registro. Puedes deshacerlo en 5 segundos."],
    ["reminders.card.actions.1", "Posponer"],
    ["errors.save-failed-local", "No se pudo guardar. Tu entrada se guarda localmente; lo intentaremos de nuevo más tarde."],
  ]);

  const mismatches = [...expectedValues].flatMap(([path, expected]) => {
    const actual = getPath(spanish, path);
    return actual === expected ? [] : [`${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`];
  });

  const forbiddenPatterns = [
    [/OMS/, "Spanish who-header must not use the World Health Organization acronym"],
    [/troncos/i, "Spanish potty logs must not mention wooden logs"],
    [/\bBocar\b/i, "Spanish biting copy must not use a non-Spanish verb"],
    [/\bMordaz\b/i, "Spanish biting tracker copy must use a noun"],
    [/\bCapacitación\b/i, "Spanish puppy-training copy standardizes on entrenamiento"],
    [/\bcaminata\b/i, "Spanish routine copy standardizes on paseo"],
    [/\bdespues\b/i, "Spanish después requires an accent mark"],
    [/\bdormi\b/i, "Spanish dormí requires an accent mark"],
    [/\bestan\b/i, "Spanish están requires an accent mark"],
    [/\bmas\b/i, "Spanish más requires an accent mark"],
    [/\bLa caja como lugar tranquilo\b/i, "Spanish crate guidance standardizes on jaula"],
  ];
  const forbiddenHits = collectLeafStrings(spanish).flatMap(({ path, value }) =>
    forbiddenPatterns
      .filter(([pattern]) => pattern.test(value))
      .map(([, reason]) => `${path}: ${reason}: ${JSON.stringify(value)}`),
  );

  assert.deepEqual([...mismatches, ...forbiddenHits], []);
});

test("destructive confirmation prompts name their configured required word", () => {
  for (const localeFile of ["STRINGS.en.json", "STRINGS.ru.json", "STRINGS.es.json"]) {
    const strings = readJson(localeFile);
    const word = getPath(strings, "more.privacy.delete-sheet.confirm-input-word");
    const prompt = getPath(strings, "more.privacy.delete-sheet.confirm-input-prompt");

    assert.ok(prompt.includes(word), `${localeFile} prompt must mention ${JSON.stringify(word)}`);
  }

  assert.equal(getPath(readJson("STRINGS.es.json"), "more.privacy.delete-sheet.confirm-input-word"), "ELIMINAR");
});

test("Spanish copy uses the informal register for cited user-facing strings", () => {
  const spanish = readJson("STRINGS.es.json");
  const forbiddenPatterns = [
    [/\busted\b/i, "use tú instead of usted"],
    [/\bElija\b/, "use elige instead of Elija"],
    [/\bdiga\b/, "use di instead of diga"],
    [/\bDeje\b/, "use deja instead of Deje"],
    [/\bUtilice\b/, "use usa instead of Utilice"],
    [/comuníquese/i, "use contacta instead of comuníquese"],
    [/\bPruebe\b/, "use prueba instead of Pruebe"],
    [/\bpermita\b/, "use permite instead of permita"],
    [/\bPóngase\b/, "use contacta instead of Póngase"],
    [/\bRegistre su\b/, "use Registra tu"],
    [/\bComience\b/, "use Empieza"],
    [/\bObserve\b/, "use Observa"],
    [/\bAbra\b/, "use Abre"],
    [/\bSus cambios\b/, "use Tus cambios"],
    [/\bSu evento\b/, "use Tu evento"],
    [/\bSu entrada\b/, "use Tu entrada"],
    [/\bsu acceso\b/i, "use tu acceso"],
    [/\bsu registro\b/i, "use tu registro"],
    [/\bsu veterinario\b/i, "use tu veterinario"],
    [/\bPídale\b/, "use Pídele"],
    [/Por favor inténtalo/i, "use a direct informal retry sentence"],
    [/Si su cachorro/i, "use Si tu cachorro"],
    [/Le enviaremos/i, "use Te enviaremos"],
    [/La última ruptura/i, "use pausa, not ruptura, for potty break"],
    [/\bOrinal\b/i, "use baño/pausa al baño instead of Orinal"],
    [/\bSiesta\b/i, "use Posponer for snooze"],
    [/\{walks\} sale/i, "use natural plural wording for walk count"],
    [/\{feedings\} se alimenta/i, "use natural plural wording for feeding count"],
    [/\{n\} hace minutos/i, "use hace {n} min"],
    [/se rompe/i, "do not translate breaks as rompe"],
  ];

  const hits = collectLeafStrings(spanish).flatMap(({ path, value }) =>
    forbiddenPatterns
      .filter(([pattern]) => pattern.test(value))
      .map(([, reason]) => `${path}: ${reason}: ${JSON.stringify(value)}`),
  );

  assert.deepEqual(hits, []);
});
