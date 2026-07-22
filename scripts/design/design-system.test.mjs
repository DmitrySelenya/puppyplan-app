import assert from "node:assert/strict";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { renderInventoryBlock } from "./lib/catalog.mjs";
import { runCli } from "./design-system.mjs";

const catalog = JSON.parse(
  readFileSync(new URL("../../src/design/catalog/catalog.json", import.meta.url), "utf8"),
);

function createIo() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stderr: {
        write(value) {
          stderr += value;
        },
      },
      stdout: {
        write(value) {
          stdout += value;
        },
      },
    },
    output() {
      return { stderr, stdout };
    },
  };
}

function createRepository({ broken = false } = {}) {
  const files = new Map([
    [
      catalog.coverage.barrel,
      broken
        ? "export { NewPrimitive } from './NewPrimitive';"
        : `${catalog.components
            .map(({ name }) => `export { ${name} } from './${name}';`)
            .join("\n")}\nexport { ${catalog.coverage.ignoredExports
            .map(({ name }) => name)
            .join(", ")} } from './helpers';`,
    ],
    [catalog.documentation.file, `# Design Runtime\n\n${renderInventoryBlock(catalog)}\n`],
  ]);
  for (const component of catalog.components) {
    files.set(component.source, `export function ${component.name}() {}`);
    for (const path of component.tests) files.set(path, `test ${component.name}`);
    for (const path of component.gallery) files.set(path, `gallery ${component.name}`);
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

async function execute(args, overrides = {}) {
  const capture = createIo();
  const code = await runCli(args, {
    catalog,
    io: capture.io,
    repository: createRepository(),
    ...overrides,
  });
  return { code, ...capture.output() };
}

test("AC-6: search JSON is a clean versioned envelope with deterministic top result", async () => {
  const result = await execute(["search", "settings", "row", "with", "chevron", "--json"]);
  const payload = JSON.parse(result.stdout);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.command, "search");
  assert.equal(payload.query, "settings row with chevron");
  assert.equal(payload.results[0].name, "ListRow");
});

test("AC-5: component brief, dense, full, and JSON views project the same contract", async () => {
  const brief = await execute(["component", "button", "--brief"]);
  const dense = await execute(["component", "PrimaryButton", "--dense"]);
  const full = await execute(["component", "Button", "--full"]);
  const json = await execute(["component", "Button", "--json"]);
  const jsonPayload = JSON.parse(json.stdout);

  assert.equal(brief.code, 0);
  assert.match(brief.stdout, /^Button \[action\] — Labeled primary/);
  assert.match(dense.stdout, /Use when:\n- Triggering an important labeled action/);
  assert.match(dense.stdout, /Source: src\/design\/primitives\/Button\.tsx \(ButtonProps\)/);
  assert.match(full.stdout, /Keywords: action, call to action/);
  assert.match(full.stdout, /Tests: src\/test\/design-primitives\.render\.test\.tsx/);
  assert.equal(jsonPayload.schemaVersion, 1);
  assert.equal(jsonPayload.command, "component");
  assert.equal(jsonPayload.component.name, "Button");
  assert.equal(jsonPayload.mode, "full");
});

test("AC-7: manifest JSON exposes commands and complete catalog inventory", async () => {
  const result = await execute(["manifest", "--json"]);
  const payload = JSON.parse(result.stdout);

  assert.equal(result.code, 0);
  assert.equal(payload.command, "manifest");
  assert.equal(payload.manifest.catalogVersion, "1.0.0");
  assert.equal(payload.manifest.components.length, catalog.components.length);
  assert.deepEqual(
    payload.manifest.commands.map(({ name }) => name),
    ["component", "doctor", "manifest", "search"],
  );
});

test("AC-9: doctor JSON returns diagnostics and exit 1 when failures exist", async () => {
  const result = await execute(["doctor", "--json"], {
    repository: createRepository({ broken: true }),
  });
  const payload = JSON.parse(result.stdout);

  assert.equal(result.code, 1);
  assert.equal(result.stderr, "");
  assert.equal(payload.command, "doctor");
  assert.equal(payload.report.summary.fail > 0, true);
  assert.equal(
    payload.report.diagnostics.some(({ code }) => code === "UNACCOUNTED_EXPORT"),
    true,
  );
});

test("ERR-3/ERR-5: doctor contains repository inspection failures", async () => {
  const result = await execute(["doctor", "--json"], {
    repository: {
      fileExists() {
        throw new Error("synthetic repository failure");
      },
      readText() {
        throw new Error("synthetic repository failure");
      },
    },
  });

  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  const payload = JSON.parse(result.stderr);
  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.command, "doctor");
  assert.equal(payload.error.type, "repository");
  assert.equal(payload.error.message, "Design repository could not be inspected.");
});

test("ERR-1/ERR-2/ERR-5: JSON usage errors are machine-clean and exit 2", async () => {
  const emptySearch = await execute(["search", "--json"]);
  const unknownComponent = await execute(["component", "MysteryWidget", "--json"]);
  const invalidLimit = await execute(["search", "button", "--limit", "0", "--json"]);

  for (const result of [emptySearch, unknownComponent, invalidLimit]) {
    assert.equal(result.code, 2);
    assert.equal(result.stdout, "");
    const error = JSON.parse(result.stderr);
    assert.equal(error.schemaVersion, 1);
    assert.equal(error.error.type, "usage");
  }
  assert.match(JSON.parse(emptySearch.stderr).error.message, /Search query is required/);
  assert.match(JSON.parse(unknownComponent.stderr).error.message, /Unknown component/);
  assert.match(JSON.parse(invalidLimit.stderr).error.message, /positive integer/);
});

test("ERR-2: human unknown-component error includes close catalog suggestions", async () => {
  const result = await execute(["component", "Buton"]);

  assert.equal(result.code, 2);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Unknown component "Buton"/);
  assert.match(result.stderr, /Button/);
});

test("ERR-3/ERR-5: malformed catalog JSON returns a machine-clean error envelope", () => {
  const fixtureRoot = realpathSync(mkdtempSync(join(tmpdir(), "puppyplan-design-cli-")));

  try {
    const scriptDirectory = join(fixtureRoot, "scripts/design");
    const libraryDirectory = join(scriptDirectory, "lib");
    const catalogDirectory = join(fixtureRoot, "src/design/catalog");
    mkdirSync(libraryDirectory, { recursive: true });
    mkdirSync(catalogDirectory, { recursive: true });
    cpSync(new URL("./design-system.mjs", import.meta.url), join(scriptDirectory, "design-system.mjs"));
    cpSync(new URL("./lib/catalog.mjs", import.meta.url), join(libraryDirectory, "catalog.mjs"));
    writeFileSync(join(catalogDirectory, "catalog.json"), "{ invalid json\n", "utf8");

    const result = spawnSync(
      process.execPath,
      [join(scriptDirectory, "design-system.mjs"), "doctor", "--json"],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    const payload = JSON.parse(result.stderr);
    assert.equal(payload.schemaVersion, 1);
    assert.equal(payload.command, "doctor");
    assert.equal(payload.error.type, "catalog");
    assert.equal(payload.error.message, "Catalog JSON could not be loaded.");
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});
