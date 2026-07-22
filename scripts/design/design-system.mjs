#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildManifest,
  findComponent,
  projectComponent,
  runDoctor,
  searchCatalog,
  validateCatalog,
} from "./lib/catalog.mjs";

const repoRootFromScript = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function createRepository(repoRoot) {
  return {
    fileExists(path) {
      return existsSync(join(repoRoot, path));
    },
    readText(path) {
      return readFileSync(join(repoRoot, path), "utf8");
    },
  };
}

function loadCatalog(repoRoot) {
  return JSON.parse(readFileSync(join(repoRoot, "src/design/catalog/catalog.json"), "utf8"));
}

async function runMain(args) {
  const io = { stderr: process.stderr, stdout: process.stdout };
  const command = args[0] ?? "help";
  const json = args.includes("--json");
  let catalog;

  try {
    catalog = loadCatalog(repoRootFromScript);
  } catch {
    return commandError(io, command, "catalog", "Catalog JSON could not be loaded.", { json });
  }

  return runCli(args, {
    catalog,
    io,
    repository: createRepository(repoRootFromScript),
  });
}

function writeJson(stream, value) {
  stream.write(`${JSON.stringify(value, null, 2)}\n`);
}

function commandError(io, command, type, message, { json }) {
  if (json) {
    writeJson(io.stderr, {
      schemaVersion: 1,
      command,
      error: { type, message },
    });
  } else {
    io.stderr.write(`${type === "catalog" ? "Catalog" : "Repository"} error: ${message}\n`);
  }
  return 1;
}

function usageError(io, command, message, { json, suggestions = [] } = {}) {
  if (json) {
    writeJson(io.stderr, {
      schemaVersion: 1,
      command,
      error: {
        type: "usage",
        message,
        ...(suggestions.length > 0 ? { suggestions } : {}),
      },
    });
  } else {
    io.stderr.write(`Error: ${message}\n`);
    if (suggestions.length > 0) io.stderr.write(`Suggestions: ${suggestions.join(", ")}\n`);
  }
  return 2;
}

function levenshteinDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const current = [leftIndex + 1];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const insertion = current[rightIndex] + 1;
      const deletion = previous[rightIndex + 1] + 1;
      const substitution = previous[rightIndex] + (left[leftIndex] === right[rightIndex] ? 0 : 1);
      current.push(Math.min(insertion, deletion, substitution));
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous.at(-1);
}

function componentSuggestions(catalog, query) {
  const normalized = query.toLocaleLowerCase("en-US");
  return catalog.components
    .map(({ name }) => ({ name, distance: levenshteinDistance(normalized, name.toLowerCase()) }))
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        (left.name < right.name ? -1 : left.name > right.name ? 1 : 0),
    )
    .slice(0, 3)
    .map(({ name }) => name);
}

function parseSearchArgs(args) {
  const queryParts = [];
  const json = args.includes("--json");
  let limit = 5;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") {
      continue;
    } else if (arg === "--limit") {
      const value = Number(args[index + 1]);
      if (!Number.isInteger(value) || value < 1) {
        return { error: "--limit must be a positive integer", json };
      }
      limit = value;
      index += 1;
    } else if (arg.startsWith("--")) {
      return { error: `Unknown search option: ${arg}`, json };
    } else {
      queryParts.push(arg);
    }
  }
  return { json, limit, query: queryParts.join(" ").trim() };
}

function parseComponentArgs(args) {
  const names = [];
  const requestedModes = [];
  const json = args.includes("--json");
  for (const arg of args) {
    if (arg === "--json") continue;
    else if (["--brief", "--dense", "--full"].includes(arg)) requestedModes.push(arg.slice(2));
    else if (arg.startsWith("--")) return { error: `Unknown component option: ${arg}`, json };
    else names.push(arg);
  }
  if (requestedModes.length > 1) {
    return { error: "Choose only one of --brief, --dense, or --full", json };
  }
  if (names.length > 1) return { error: "Component accepts exactly one name", json };
  return {
    json,
    mode: requestedModes[0] ?? (json ? "full" : "dense"),
    name: names[0],
  };
}

function formatSearch(query, results) {
  const lines = [`Search: ${query}`];
  results.forEach((result, index) => {
    lines.push(`${index + 1}. ${result.name} [${result.category}] — ${result.summary}`);
    lines.push(`   Source: ${result.source}; score: ${result.score}`);
  });
  return `${lines.join("\n")}\n`;
}

function formatComponent(component, mode) {
  if (mode === "brief") {
    return `${component.name} [${component.category}] — ${component.summary}\n`;
  }
  const lines = [
    `${component.name} [${component.category}]`,
    component.summary,
    "",
    "Use when:",
    ...component.useWhen.map((item) => `- ${item}`),
    "Avoid when:",
    ...component.avoidWhen.map((item) => `- ${item}`),
    `States: ${component.states.join(", ")}`,
    "Accessibility:",
    ...component.accessibility.map((item) => `- ${item}`),
    `Related: ${component.related.length > 0 ? component.related.join(", ") : "none"}`,
    `Source: ${component.source} (${component.propsType})`,
  ];
  if (mode === "full") {
    lines.push(
      `Aliases: ${component.aliases.length > 0 ? component.aliases.join(", ") : "none"}`,
      `Keywords: ${component.keywords.join(", ")}`,
      `Tests: ${component.tests.length > 0 ? component.tests.join(", ") : "none declared"}`,
      `Gallery: ${component.gallery.length > 0 ? component.gallery.join(", ") : "none declared"}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function formatManifest(manifest) {
  return [
    `Design catalog ${manifest.catalogVersion} (${manifest.components.length} components)`,
    "Commands:",
    ...manifest.commands.map(({ name, purpose }) => `- ${name}: ${purpose}`),
    "",
  ].join("\n");
}

function formatDoctor(report) {
  const lines = report.diagnostics.map(
    ({ code, fix, message, severity }) =>
      `[${severity}] ${code}: ${message}${fix ? `\n  Fix: ${fix}` : ""}`,
  );
  lines.push(
    `Summary: PASS ${report.summary.pass}, WARN ${report.summary.warn}, FAIL ${report.summary.fail}`,
  );
  return `${lines.join("\n")}\n`;
}

export async function runCli(
  args,
  {
    catalog = loadCatalog(repoRootFromScript),
    io = { stderr: process.stderr, stdout: process.stdout },
    repository = createRepository(repoRootFromScript),
  } = {},
) {
  const [command, ...commandArgs] = args;
  const json = commandArgs.includes("--json");
  if (!command) return usageError(io, "help", "Command is required", { json });

  const validation = validateCatalog(catalog);
  if (!validation.ok && command !== "doctor") {
    const payload = {
      schemaVersion: catalog.schemaVersion ?? 1,
      command,
      error: { type: "catalog", message: validation.errors.join("; ") },
    };
    if (json) writeJson(io.stderr, payload);
    else io.stderr.write(`Catalog error: ${payload.error.message}\n`);
    return 1;
  }

  if (command === "search") {
    const parsed = parseSearchArgs(commandArgs);
    if (parsed.error) return usageError(io, command, parsed.error, parsed);
    if (!parsed.query) return usageError(io, command, "Search query is required", parsed);
    const results = searchCatalog(catalog, parsed.query, { limit: parsed.limit });
    if (parsed.json) {
      writeJson(io.stdout, {
        schemaVersion: catalog.schemaVersion,
        command,
        query: parsed.query,
        count: results.length,
        results,
      });
    } else {
      io.stdout.write(formatSearch(parsed.query, results));
    }
    return 0;
  }

  if (command === "component") {
    const parsed = parseComponentArgs(commandArgs);
    if (parsed.error) return usageError(io, command, parsed.error, parsed);
    if (!parsed.name) return usageError(io, command, "Component name is required", parsed);
    const component = findComponent(catalog, parsed.name);
    if (!component) {
      const suggestions = componentSuggestions(catalog, parsed.name);
      return usageError(io, command, `Unknown component "${parsed.name}"`, {
        ...parsed,
        suggestions,
      });
    }
    const projected = projectComponent(component, parsed.mode);
    if (parsed.json) {
      writeJson(io.stdout, {
        schemaVersion: catalog.schemaVersion,
        command,
        mode: parsed.mode,
        component: projected,
      });
    } else {
      io.stdout.write(formatComponent(projected, parsed.mode));
    }
    return 0;
  }

  if (command === "manifest") {
    const unexpected = commandArgs.filter((arg) => arg !== "--json");
    if (unexpected.length > 0) {
      return usageError(io, command, `Unknown manifest option: ${unexpected[0]}`, { json });
    }
    const manifest = buildManifest(catalog);
    if (json) {
      writeJson(io.stdout, { schemaVersion: catalog.schemaVersion, command, manifest });
    } else {
      io.stdout.write(formatManifest(manifest));
    }
    return 0;
  }

  if (command === "doctor") {
    const unexpected = commandArgs.filter((arg) => arg !== "--json");
    if (unexpected.length > 0) {
      return usageError(io, command, `Unknown doctor option: ${unexpected[0]}`, { json });
    }
    let report;
    try {
      report = runDoctor(catalog, repository);
    } catch {
      return commandError(
        io,
        command,
        "repository",
        "Design repository could not be inspected.",
        { json },
      );
    }
    if (json) {
      writeJson(io.stdout, { schemaVersion: catalog.schemaVersion, command, report });
    } else {
      io.stdout.write(formatDoctor(report));
    }
    return report.summary.fail > 0 ? 1 : 0;
  }

  return usageError(io, command, `Unknown command "${command}"`, { json });
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  process.exitCode = await runMain(process.argv.slice(2));
}
