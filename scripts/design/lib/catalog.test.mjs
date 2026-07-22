import assert from "node:assert/strict";
import test from "node:test";

import {
  buildManifest,
  findComponent,
  normalizeSearchText,
  parseRuntimeExports,
  renderInventoryBlock,
  runDoctor,
  searchCatalog,
  validateCatalog,
} from "./catalog.mjs";

const fixtureCatalog = {
  schemaVersion: 1,
  catalogVersion: "1.0.0",
  coverage: {
    barrel: "src/design/primitives/index.ts",
    ignoredExports: [
      {
        name: "useSnackbar",
        reason: "Hook documented through the SnackbarProvider entry.",
      },
    ],
  },
  documentation: {
    file: "src/design/README.md",
    marker: "DESIGN-CATALOG",
  },
  components: [
    {
      name: "Button",
      aliases: ["PrimaryButton", "CTA"],
      category: "action",
      summary: "Labeled primary, secondary, tertiary, or destructive action.",
      keywords: [
        "action",
        "call to action",
        "destructive confirmation",
        "кнопка",
      ],
      useWhen: ["Triggering a labeled action or destructive confirmation."],
      avoidWhen: ["The action is icon-only."],
      states: ["default", "pressed", "disabled", "loading"],
      accessibility: ["Owns button role, busy state, and minimum touch target."],
      related: ["IconButton"],
      source: "src/design/primitives/Button.tsx",
      propsType: "ButtonProps",
      tests: ["src/test/design-primitives.render.test.tsx"],
      gallery: [],
    },
    {
      name: "EmptyState",
      aliases: ["NeutralEmptyState"],
      category: "feedback",
      summary: "Empty screen explanation with one clear next action.",
      keywords: ["empty", "no data", "next action", "пустой экран"],
      useWhen: ["A screen has no content and needs one recovery or creation action."],
      avoidWhen: ["Content is still loading."],
      states: ["empty"],
      accessibility: ["Keeps illustration decorative and text/action readable."],
      related: ["Button"],
      source: "src/design/primitives/EmptyState.tsx",
      propsType: "EmptyStateProps",
      tests: ["src/test/design-primitives.render.test.tsx"],
      gallery: ["src/features/_dev/design-gallery/DesignGalleryScreen.tsx"],
    },
    {
      name: "IconButton",
      aliases: [],
      category: "action",
      summary: "Compact icon-only action with an explicit accessible label.",
      keywords: ["icon only", "compact action", "toolbar action"],
      useWhen: ["A familiar icon action must fit compact chrome."],
      avoidWhen: ["A visible text label is important for comprehension."],
      states: ["default", "pressed", "disabled"],
      accessibility: ["Requires an accessible label and owns button semantics."],
      related: ["Button", "Touchable"],
      source: "src/design/primitives/IconButton.tsx",
      propsType: "IconButtonProps",
      tests: ["src/test/design-primitives.render.test.tsx"],
      gallery: [],
    },
    {
      name: "ListRow",
      aliases: ["ListItem", "SettingsRow"],
      category: "layout",
      summary: "Structured row for settings, health, and timeline lists.",
      keywords: [
        "settings row",
        "chevron",
        "list item",
        "navigation row",
        "строка настроек",
      ],
      useWhen: ["A row needs title, supporting copy, metadata, or a chevron."],
      avoidWhen: ["The content is a free-form card."],
      states: ["static", "pressed", "selected", "disabled"],
      accessibility: ["Interactive rows expose one button-like accessibility node."],
      related: ["Button", "Touchable"],
      source: "src/design/primitives/ListRow.tsx",
      propsType: "ListRowProps",
      tests: ["src/test/design-primitives.render.test.tsx"],
      gallery: ["src/features/_dev/design-gallery/DesignGalleryScreen.tsx"],
    },
    {
      name: "Touchable",
      aliases: [],
      category: "action",
      summary: "Design-owned low-level press wrapper with touch-target enforcement.",
      keywords: ["pressable", "custom interaction", "touch target"],
      useWhen: ["No higher-level design primitive fits a custom interaction."],
      avoidWhen: ["Button, IconButton, ListRow, Card, or TrackerTile already fits."],
      states: ["default", "pressed", "disabled", "busy"],
      accessibility: ["Requires explicit label and role."],
      related: ["Button", "IconButton", "ListRow"],
      source: "src/design/primitives/Touchable.tsx",
      propsType: "TouchableProps",
      tests: ["src/test/design-primitives.render.test.tsx"],
      gallery: [],
    },
  ],
};

test("AC-1: validates a complete catalog and reports malformed fields", () => {
  assert.deepEqual(validateCatalog(fixtureCatalog), { errors: [], ok: true });

  const malformed = structuredClone(fixtureCatalog);
  malformed.components[0].name = "";
  malformed.components[0].category = "mystery";
  malformed.components[1].keywords = [];
  malformed.coverage.ignoredExports[0].reason = "";

  assert.deepEqual(validateCatalog(malformed), {
    errors: [
      "components[0].name must be a non-empty string",
      "components[0].category must be a known design catalog category",
      "components[1].keywords must be a non-empty string array",
      "coverage.ignoredExports[0].reason must be a non-empty string",
    ],
    ok: false,
  });
});

test("AC-3/EC-1: normalizes Unicode intent deterministically", () => {
  assert.equal(
    normalizeSearchText("  СТРОКА-настроек,   with CHEVRON!! "),
    "строка настроек with chevron",
  );
});

test("AC-3: ranking is stable when catalog source order changes", () => {
  const forward = searchCatalog(fixtureCatalog, "action", { limit: 5 });
  const reversedCatalog = {
    ...fixtureCatalog,
    components: [...fixtureCatalog.components].reverse(),
  };
  const reversed = searchCatalog(reversedCatalog, "action", { limit: 5 });

  assert.deepEqual(
    forward.map(({ name }) => name),
    reversed.map(({ name }) => name),
  );
  assert.deepEqual(
    forward.map(({ name }) => name),
    ["Button", "EmptyState", "IconButton", "Touchable"],
  );
});

test("AC-4: acceptance intent queries rank the expected primitives", () => {
  const settingsRow = searchCatalog(fixtureCatalog, "settings row with chevron")[0];
  assert.equal(settingsRow.name, "ListRow");
  assert.deepEqual(settingsRow.matches, ["alias", "keyword", "summary", "useWhen"]);
  assert.equal(searchCatalog(fixtureCatalog, "destructive confirmation action")[0].name, "Button");
  assert.deepEqual(
    searchCatalog(fixtureCatalog, "empty screen next action", { limit: 3 }).map(
      ({ name }) => name,
    ),
    ["EmptyState", "Button", "IconButton"],
  );
});

test("AC-5: component lookup is case-insensitive and resolves aliases", () => {
  assert.equal(findComponent(fixtureCatalog, "button").name, "Button");
  assert.equal(findComponent(fixtureCatalog, "SETTINGSROW").name, "ListRow");
  assert.equal(findComponent(fixtureCatalog, "not-a-component"), undefined);
});

test("EC-2: search rejects invalid limits and handles an empty normalized query", () => {
  assert.deepEqual(searchCatalog(fixtureCatalog, " -- "), []);
  assert.throws(
    () => searchCatalog(fixtureCatalog, "button", { limit: 0 }),
    /limit must be a positive integer/,
  );
  assert.throws(
    () => searchCatalog(fixtureCatalog, "button", { limit: 1.5 }),
    /limit must be a positive integer/,
  );
});

function createRepositoryFixture(
  catalog,
  {
    barrelSource = catalog.components
      .map((component) => `export { ${component.name}, type ${component.propsType} } from "./${component.name}";`)
      .join("\n") +
      `\nexport { ${catalog.coverage.ignoredExports.map(({ name }) => name).join(", ")} } from "./helpers";`,
    documentation = `# Design Runtime\n\n${renderInventoryBlock(catalog)}\n`,
    missingPaths = [],
  } = {},
) {
  const files = new Map([
    [catalog.coverage.barrel, barrelSource],
    [catalog.documentation.file, documentation],
  ]);

  for (const component of catalog.components) {
    if (!missingPaths.includes(component.source)) {
      files.set(component.source, `export function ${component.name}() {}`);
    }
    for (const testPath of component.tests) {
      if (!missingPaths.includes(testPath)) files.set(testPath, `test ${component.name}`);
    }
    for (const galleryPath of component.gallery) {
      if (!missingPaths.includes(galleryPath)) files.set(galleryPath, `gallery ${component.name}`);
    }
  }

  return {
    fileExists(path) {
      return files.has(path);
    },
    readText(path) {
      const value = files.get(path);
      if (value === undefined) throw new Error(`Missing fixture path: ${path}`);
      return value;
    },
  };
}

function failureCodes(report) {
  return report.diagnostics
    .filter(({ severity }) => severity === "FAIL")
    .map(({ code }) => code);
}

test("AC-2: parses runtime values from multiline TypeScript barrel exports", () => {
  const source = `
    export {
      Button,
      type ButtonProps,
      type ButtonVariant,
    } from '@/design/primitives/Button';
    export { SnackbarProvider, useSnackbar, type SnackbarMessage } from './Snackbar';
    const localHelper = () => undefined;
    export { localHelper };
    export const designVersion = 1;
    export function makeDesignId() {}
    export class DesignBoundary {}
    export enum DesignTone { Calm }
    export type { DesignCatalog } from './schema';
    export interface DesignMetadata {}
  `;

  assert.deepEqual(parseRuntimeExports(source), [
    "Button",
    "DesignBoundary",
    "DesignTone",
    "SnackbarProvider",
    "designVersion",
    "localHelper",
    "makeDesignId",
    "useSnackbar",
  ]);
});

test("AC-2/ERR-3: doctor fails unsupported export-all syntax instead of missing coverage", () => {
  const repository = createRepositoryFixture(fixtureCatalog, {
    barrelSource: "export * from './all';",
  });
  const report = runDoctor(fixtureCatalog, repository);
  const unsupported = report.diagnostics.find(
    ({ code }) => code === "UNSUPPORTED_BARREL_EXPORT",
  );

  assert.deepEqual(
    {
      code: unsupported.code,
      severity: unsupported.severity,
    },
    {
      code: "UNSUPPORTED_BARREL_EXPORT",
      severity: "FAIL",
    },
  );
});

test("AC-7: manifest is versioned and self-describes the four CLI commands", () => {
  const manifest = buildManifest(fixtureCatalog);

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.catalogVersion, "1.0.0");
  assert.deepEqual(
    manifest.commands.map(({ name }) => name),
    ["component", "doctor", "manifest", "search"],
  );
  assert.deepEqual(
    manifest.components.map(({ name }) => name),
    ["Button", "EmptyState", "IconButton", "ListRow", "Touchable"],
  );
  assert.deepEqual(manifest.coverage.ignoredExports, ["useSnackbar"]);
});

test("AC-8/AC-9: doctor accepts a coherent repository and keeps optional gaps as warnings", () => {
  const report = runDoctor(fixtureCatalog, createRepositoryFixture(fixtureCatalog));

  assert.deepEqual(failureCodes(report), []);
  assert.equal(report.summary.fail, 0);
  assert.equal(report.summary.pass > 0, true);
  assert.equal(
    report.diagnostics.some(
      ({ code, severity }) => code === "MISSING_GALLERY_COVERAGE" && severity === "WARN",
    ),
    true,
  );
});

test("ERR-3: doctor reports a structurally malformed catalog instead of throwing", () => {
  const report = runDoctor(
    { schemaVersion: 1 },
    {
      fileExists() {
        throw new Error("repository must not be inspected for an unusable catalog");
      },
      readText() {
        throw new Error("repository must not be inspected for an unusable catalog");
      },
    },
  );

  assert.deepEqual(failureCodes(report), ["CATALOG_INVALID"]);
  assert.equal(report.summary.fail, 1);
});

test("ERR-3: doctor contains malformed catalog array items before repository inspection", () => {
  const malformedCatalog = structuredClone(fixtureCatalog);
  malformedCatalog.components[0].tests = [null];

  const report = runDoctor(malformedCatalog, {
    fileExists() {
      throw new Error("repository must not be inspected for an unusable catalog");
    },
    readText() {
      throw new Error("repository must not be inspected for an unusable catalog");
    },
  });

  assert.deepEqual(failureCodes(report), ["CATALOG_INVALID"]);
  assert.equal(report.summary.fail, 1);
});

test("AC-8: doctor fails duplicate names and alias collisions", () => {
  const duplicateCatalog = structuredClone(fixtureCatalog);
  duplicateCatalog.components.push(structuredClone(duplicateCatalog.components[0]));
  duplicateCatalog.components[1].aliases.push("Button");
  const report = runDoctor(duplicateCatalog, createRepositoryFixture(duplicateCatalog));

  assert.deepEqual(failureCodes(report), [
    "DUPLICATE_COMPONENT_NAME",
    "ALIAS_COLLISION",
    "UNSORTED_COMPONENTS",
  ]);
});

test("AC-8: doctor fails unknown relationships and missing declared references", () => {
  const brokenCatalog = structuredClone(fixtureCatalog);
  brokenCatalog.components[0].related.push("MissingPrimitive");
  brokenCatalog.components[1].tests.push("src/test/missing.test.ts");
  const repository = createRepositoryFixture(brokenCatalog, {
    missingPaths: ["src/test/missing.test.ts"],
  });
  const report = runDoctor(brokenCatalog, repository);

  assert.deepEqual(failureCodes(report), ["UNKNOWN_RELATED_COMPONENT", "MISSING_REFERENCE"]);
});

test("AC-2/AC-8: doctor fails an unaccounted runtime export and empty ignore reason", () => {
  const brokenCatalog = structuredClone(fixtureCatalog);
  brokenCatalog.coverage.ignoredExports[0].reason = "";
  const repository = createRepositoryFixture(brokenCatalog, {
    barrelSource: `
      export { Button, EmptyState, IconButton, ListRow, Touchable, useSnackbar, NewPrimitive } from './all';
    `,
  });
  const report = runDoctor(brokenCatalog, repository);

  assert.deepEqual(failureCodes(report), ["CATALOG_INVALID", "UNACCOUNTED_EXPORT"]);
});

test("AC-8/ERR-4: doctor fails a stale documentation inventory with an actionable fix", () => {
  const repository = createRepositoryFixture(fixtureCatalog, {
    documentation: `# Design Runtime\n\n<!-- DESIGN-CATALOG:START -->\nstale\n<!-- DESIGN-CATALOG:END -->\n`,
  });
  const report = runDoctor(fixtureCatalog, repository);
  const staleDiagnostic = report.diagnostics.find(({ code }) => code === "STALE_DOCUMENTATION");

  assert.deepEqual(
    {
      code: staleDiagnostic.code,
      fix: staleDiagnostic.fix,
      severity: staleDiagnostic.severity,
    },
    {
      code: "STALE_DOCUMENTATION",
      fix: "Replace the DESIGN-CATALOG marker block in src/design/README.md with the generated inventory block.",
      severity: "FAIL",
    },
  );
});
