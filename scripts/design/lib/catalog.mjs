const componentStringFields = ["name", "category", "summary", "source", "propsType"];
const designCatalogCategories = new Set([
  "action",
  "data-display",
  "feedback",
  "iconography",
  "identity",
  "input",
  "layout",
  "navigation",
  "surface",
  "typography",
]);
const componentArrayFields = [
  ["aliases", false],
  ["keywords", true],
  ["useWhen", true],
  ["avoidWhen", true],
  ["states", true],
  ["accessibility", true],
  ["related", false],
  ["tests", false],
  ["gallery", false],
];
const searchWeights = {
  exactName: 1_000,
  partialName: 300,
  exactAlias: 900,
  partialAlias: 250,
  exactKeyword: 200,
  partialKeyword: 120,
  exactSummary: 80,
  exactUseWhen: 70,
  exactAvoidWhen: 40,
  tokenName: 60,
  tokenAlias: 50,
  tokenKeyword: 25,
  tokenSummary: 15,
  tokenUseWhen: 12,
  tokenAvoidWhen: 6,
  tokenSupporting: 3,
};

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function isStringArray(value, requireItem) {
  return (
    Array.isArray(value) &&
    (!requireItem || value.length > 0) &&
    value.every((item) => isNonEmptyString(item))
  );
}

export function validateCatalog(catalog) {
  const errors = [];

  if (catalog === null || typeof catalog !== "object" || Array.isArray(catalog)) {
    return { errors: ["catalog must be an object"], ok: false };
  }

  if (catalog.schemaVersion !== 1) {
    errors.push("schemaVersion must equal 1");
  }
  if (!isNonEmptyString(catalog.catalogVersion)) {
    errors.push("catalogVersion must be a non-empty string");
  }
  if (!Array.isArray(catalog.components) || catalog.components.length === 0) {
    errors.push("components must be a non-empty array");
  } else {
    catalog.components.forEach((component, componentIndex) => {
      for (const field of componentStringFields) {
        if (!isNonEmptyString(component?.[field])) {
          errors.push(`components[${componentIndex}].${field} must be a non-empty string`);
        }
      }
      if (
        isNonEmptyString(component?.category) &&
        !designCatalogCategories.has(component.category)
      ) {
        errors.push(
          `components[${componentIndex}].category must be a known design catalog category`,
        );
      }
      for (const [field, requireItem] of componentArrayFields) {
        if (!isStringArray(component?.[field], requireItem)) {
          errors.push(
            `components[${componentIndex}].${field} must be a ${
              requireItem ? "non-empty " : ""
            }string array`,
          );
        }
      }
    });
  }

  if (!isNonEmptyString(catalog.coverage?.barrel)) {
    errors.push("coverage.barrel must be a non-empty string");
  }
  if (!Array.isArray(catalog.coverage?.ignoredExports)) {
    errors.push("coverage.ignoredExports must be an array");
  } else {
    catalog.coverage.ignoredExports.forEach((ignoredExport, ignoredIndex) => {
      if (!isNonEmptyString(ignoredExport?.name)) {
        errors.push(
          `coverage.ignoredExports[${ignoredIndex}].name must be a non-empty string`,
        );
      }
      if (!isNonEmptyString(ignoredExport?.reason)) {
        errors.push(
          `coverage.ignoredExports[${ignoredIndex}].reason must be a non-empty string`,
        );
      }
    });
  }

  if (!isNonEmptyString(catalog.documentation?.file)) {
    errors.push("documentation.file must be a non-empty string");
  }
  if (!isNonEmptyString(catalog.documentation?.marker)) {
    errors.push("documentation.marker must be a non-empty string");
  }

  return { errors, ok: errors.length === 0 };
}

export function normalizeSearchText(value) {
  return String(value)
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizedStrings(values) {
  return values.map((value) => normalizeSearchText(value));
}

function includesAny(values, searchValue) {
  return values.some((value) => value.includes(searchValue));
}

function scoreComponent(component, normalizedQuery, queryTokens) {
  const name = normalizeSearchText(component.name);
  const aliases = normalizedStrings(component.aliases);
  const keywords = normalizedStrings(component.keywords);
  const summaries = [normalizeSearchText(component.summary)];
  const useWhen = normalizedStrings(component.useWhen);
  const avoidWhen = normalizedStrings(component.avoidWhen);
  const supporting = normalizedStrings([
    ...component.states,
    ...component.accessibility,
    ...component.related,
  ]);
  let score = 0;
  const matches = [];

  if (name === normalizedQuery) {
    score += searchWeights.exactName;
    matches.push("name");
  } else if (name.includes(normalizedQuery)) {
    score += searchWeights.partialName;
    matches.push("name");
  }
  if (aliases.includes(normalizedQuery)) {
    score += searchWeights.exactAlias;
    matches.push("alias");
  } else if (includesAny(aliases, normalizedQuery)) {
    score += searchWeights.partialAlias;
    matches.push("alias");
  }
  if (keywords.includes(normalizedQuery)) {
    score += searchWeights.exactKeyword;
    matches.push("keyword");
  } else if (includesAny(keywords, normalizedQuery)) {
    score += searchWeights.partialKeyword;
    matches.push("keyword");
  }
  if (includesAny(summaries, normalizedQuery)) {
    score += searchWeights.exactSummary;
    matches.push("summary");
  }
  if (includesAny(useWhen, normalizedQuery)) {
    score += searchWeights.exactUseWhen;
    matches.push("useWhen");
  }
  if (includesAny(avoidWhen, normalizedQuery)) {
    score += searchWeights.exactAvoidWhen;
    matches.push("avoidWhen");
  }

  for (const token of queryTokens) {
    if (name.split(" ").includes(token)) {
      score += searchWeights.tokenName;
      matches.push("name");
    }
    if (includesAny(aliases, token)) {
      score += searchWeights.tokenAlias;
      matches.push("alias");
    }
    if (includesAny(keywords, token)) {
      score += searchWeights.tokenKeyword;
      matches.push("keyword");
    }
    if (includesAny(summaries, token)) {
      score += searchWeights.tokenSummary;
      matches.push("summary");
    }
    if (includesAny(useWhen, token)) {
      score += searchWeights.tokenUseWhen;
      matches.push("useWhen");
    }
    if (includesAny(avoidWhen, token)) {
      score += searchWeights.tokenAvoidWhen;
      matches.push("avoidWhen");
    }
    if (includesAny(supporting, token)) {
      score += searchWeights.tokenSupporting;
    }
  }

  return { matches: [...new Set(matches)], score };
}

export function searchCatalog(catalog, query, { limit = 5 } = {}) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("limit must be a positive integer");
  }
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length === 0) return [];
  const queryTokens = normalizedQuery.split(" ");

  return catalog.components
    .map((component) => ({ component, ...scoreComponent(component, normalizedQuery, queryTokens) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || compareText(left.component.name, right.component.name))
    .slice(0, limit)
    .map(({ component, matches, score }) => ({
      category: component.category,
      matches,
      name: component.name,
      score,
      source: component.source,
      summary: component.summary,
    }));
}

export function findComponent(catalog, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length === 0) return undefined;
  return catalog.components.find((component) => {
    if (normalizeSearchText(component.name) === normalizedQuery) return true;
    return component.aliases.some((alias) => normalizeSearchText(alias) === normalizedQuery);
  });
}

export function parseRuntimeExports(source) {
  if (/export\s+(?:\*\s+from\b|default\b)/u.test(source)) {
    throw new SyntaxError(
      "Public design barrel must use explicit named exports; export-all and default exports cannot be coverage-checked safely.",
    );
  }

  const exports = new Set();
  const exportBlocks = source.matchAll(/export\s+(?!type\b)\{([^{}]*)\}/g);

  for (const match of exportBlocks) {
    for (const rawSpecifier of match[1].split(",")) {
      const specifier = rawSpecifier.replace(/\/\/.*$/g, "").trim();
      if (specifier.length === 0 || specifier.startsWith("type ")) continue;
      const aliasParts = specifier.split(/\s+as\s+/);
      const exportedName = aliasParts.at(-1)?.trim();
      if (exportedName) exports.add(exportedName);
    }
  }

  const directDeclarations = source.matchAll(
    /export\s+(?:declare\s+)?(?:(?:async\s+)?function\*?|class|enum|const|let|var)\s+([A-Za-z_$][\w$]*)/g,
  );
  for (const match of directDeclarations) exports.add(match[1]);

  return [...exports].sort(compareText);
}

export function renderInventoryBlock(catalog) {
  const names = catalog.components.map(({ name }) => `\`${name}\``).join(", ");
  return [
    `<!-- ${catalog.documentation.marker}:START -->`,
    `Catalog version ${catalog.catalogVersion}. Cataloged runtime components (${catalog.components.length}): ${names}`,
    `<!-- ${catalog.documentation.marker}:END -->`,
  ].join("\n");
}

const commandManifest = [
  {
    name: "component",
    purpose: "Read one semantic component contract.",
    positionals: [{ name: "name", required: true, type: "string" }],
    options: ["--brief", "--dense", "--full", "--json"],
    response: "component contract projection",
  },
  {
    name: "doctor",
    purpose: "Validate catalog, public exports, references, and generated documentation inventory.",
    positionals: [],
    options: ["--json"],
    response: "PASS/WARN/FAIL diagnostics and summary",
  },
  {
    name: "manifest",
    purpose: "Describe the versioned component and CLI surface.",
    positionals: [],
    options: ["--json"],
    response: "machine-readable design tooling manifest",
  },
  {
    name: "search",
    purpose: "Rank primitives for a natural-language implementation intent.",
    positionals: [{ name: "query", required: true, type: "string" }],
    options: ["--json", "--limit <positive integer>"],
    response: "ranked component summaries",
  },
];

export function buildManifest(catalog) {
  return {
    schemaVersion: catalog.schemaVersion,
    catalogVersion: catalog.catalogVersion,
    commands: commandManifest,
    components: catalog.components.map(({ aliases, category, name, source, summary }) => ({
      aliases,
      category,
      name,
      source,
      summary,
    })),
    coverage: {
      barrel: catalog.coverage.barrel,
      ignoredExports: catalog.coverage.ignoredExports.map(({ name }) => name),
      policy: "Every runtime barrel export is cataloged or explicitly ignored with a reason.",
    },
  };
}

export function projectComponent(component, mode = "dense") {
  if (mode === "brief") {
    return {
      category: component.category,
      name: component.name,
      source: component.source,
      summary: component.summary,
    };
  }
  if (mode === "dense") {
    return {
      accessibility: component.accessibility,
      avoidWhen: component.avoidWhen,
      category: component.category,
      name: component.name,
      propsType: component.propsType,
      related: component.related,
      source: component.source,
      states: component.states,
      summary: component.summary,
      useWhen: component.useWhen,
    };
  }
  if (mode === "full") return structuredClone(component);
  throw new RangeError(`unknown component projection mode: ${mode}`);
}

function diagnostic(severity, code, message, extra = {}) {
  return { code, message, severity, ...extra };
}

function summarizeDiagnostics(diagnostics) {
  return diagnostics.reduce(
    (summary, item) => {
      summary[item.severity.toLowerCase()] += 1;
      return summary;
    },
    { fail: 0, pass: 0, warn: 0 },
  );
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    const normalized = normalizeSearchText(value);
    if (seen.has(normalized)) duplicates.add(value);
    seen.add(normalized);
  }
  return [...duplicates];
}

function inventoryBlockFromDocument(documentation, marker) {
  const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = documentation.match(
    new RegExp(`<!-- ${escapedMarker}:START -->[\\s\\S]*?<!-- ${escapedMarker}:END -->`),
  );
  return match?.[0];
}

function isDoctorInspectable(catalog) {
  return (
    Array.isArray(catalog.components) &&
    catalog.components.every(
      (component) =>
        component !== null &&
        typeof component === "object" &&
        componentStringFields.every((field) => isNonEmptyString(component[field])) &&
        componentArrayFields.every(([field, requireItem]) =>
          isStringArray(component[field], requireItem),
        ),
    ) &&
    isNonEmptyString(catalog.coverage?.barrel) &&
    Array.isArray(catalog.coverage?.ignoredExports) &&
    catalog.coverage.ignoredExports.every(
      (ignoredExport) =>
        ignoredExport !== null &&
        typeof ignoredExport === "object" &&
        isNonEmptyString(ignoredExport.name),
    ) &&
    isNonEmptyString(catalog.documentation?.file) &&
    isNonEmptyString(catalog.documentation?.marker)
  );
}

export function runDoctor(catalog, repository) {
  const diagnostics = [];
  const validation = validateCatalog(catalog);
  if (validation.ok) {
    diagnostics.push(
      diagnostic("PASS", "CATALOG_VALID", `Catalog schema version ${catalog.schemaVersion} is valid.`),
    );
  } else {
    diagnostics.push(
      diagnostic("FAIL", "CATALOG_INVALID", validation.errors.join("; "), {
        fix: "Repair the catalog fields reported by schema validation.",
      }),
    );
  }

  if (!validation.ok && !isDoctorInspectable(catalog)) {
    return { diagnostics, summary: summarizeDiagnostics(diagnostics) };
  }

  const componentNames = catalog.components.map(({ name }) => name);
  const duplicateNames = duplicateValues(componentNames);
  if (duplicateNames.length > 0) {
    diagnostics.push(
      diagnostic(
        "FAIL",
        "DUPLICATE_COMPONENT_NAME",
        `Duplicate component names: ${duplicateNames.join(", ")}.`,
        { fix: "Keep exactly one catalog entry for each public runtime component." },
      ),
    );
  }

  const normalizedNames = new Set(componentNames.map((name) => normalizeSearchText(name)));
  const aliases = catalog.components.flatMap(({ aliases: componentAliases }) => componentAliases);
  const duplicateAliases = duplicateValues(aliases);
  const aliasesMatchingNames = aliases.filter((alias) => normalizedNames.has(normalizeSearchText(alias)));
  const aliasCollisions = [...new Set([...duplicateAliases, ...aliasesMatchingNames])];
  if (aliasCollisions.length > 0) {
    diagnostics.push(
      diagnostic("FAIL", "ALIAS_COLLISION", `Colliding aliases: ${aliasCollisions.join(", ")}.`, {
        fix: "Make every component name and alias unique after case and punctuation normalization.",
      }),
    );
  }

  const sortedNames = [...componentNames].sort(compareText);
  if (JSON.stringify(componentNames) !== JSON.stringify(sortedNames)) {
    diagnostics.push(
      diagnostic("FAIL", "UNSORTED_COMPONENTS", "Catalog components are not sorted by name.", {
        fix: "Sort catalog.components alphabetically by component name.",
      }),
    );
  }

  const knownNames = new Set(componentNames);
  const unknownRelations = catalog.components.flatMap((component) =>
    component.related
      .filter((relatedName) => !knownNames.has(relatedName))
      .map((relatedName) => `${component.name} -> ${relatedName}`),
  );
  if (unknownRelations.length > 0) {
    diagnostics.push(
      diagnostic(
        "FAIL",
        "UNKNOWN_RELATED_COMPONENT",
        `Unknown related components: ${unknownRelations.join(", ")}.`,
        { fix: "Use catalog component names in related lists or add the missing catalog entry." },
      ),
    );
  }

  const missingReferences = [];
  for (const component of catalog.components) {
    const references = [
      ["source", component.source],
      ...component.tests.map((path) => ["test", path]),
      ...component.gallery.map((path) => ["gallery", path]),
    ];
    for (const [kind, path] of references) {
      if (!repository.fileExists(path)) missingReferences.push(`${component.name} ${kind}: ${path}`);
    }
    if (component.tests.length === 0) {
      diagnostics.push(
        diagnostic("WARN", "MISSING_TEST_COVERAGE", `${component.name} declares no focused test reference.`, {
          fix: `Add focused coverage and reference it from the ${component.name} catalog entry.`,
        }),
      );
    }
    if (component.gallery.length === 0) {
      diagnostics.push(
        diagnostic(
          "WARN",
          "MISSING_GALLERY_COVERAGE",
          `${component.name} declares no design gallery reference.`,
          { fix: `Add a gallery state when ${component.name} needs visual inspection coverage.` },
        ),
      );
    }
  }
  if (missingReferences.length > 0) {
    diagnostics.push(
      diagnostic("FAIL", "MISSING_REFERENCE", `Missing references: ${missingReferences.join("; ")}.`, {
        fix: "Repair or remove stale source, test, and gallery paths in the catalog.",
      }),
    );
  } else {
    diagnostics.push(
      diagnostic("PASS", "REFERENCES_VALID", "All declared source, test, and gallery paths exist."),
    );
  }

  if (!repository.fileExists(catalog.coverage.barrel)) {
    diagnostics.push(
      diagnostic("FAIL", "MISSING_BARREL", `Public barrel not found: ${catalog.coverage.barrel}.`, {
        fix: "Point coverage.barrel at the real primitive runtime export surface.",
      }),
    );
  } else {
    let runtimeExports;
    try {
      runtimeExports = parseRuntimeExports(repository.readText(catalog.coverage.barrel));
    } catch (error) {
      diagnostics.push(
        diagnostic(
          "FAIL",
          "UNSUPPORTED_BARREL_EXPORT",
          error instanceof Error ? error.message : "Unsupported public barrel export syntax.",
          { fix: "Replace export-all/default exports with explicit named exports in the public barrel." },
        ),
      );
    }

    if (runtimeExports) {
      const ignoredExports = new Set(catalog.coverage.ignoredExports.map(({ name }) => name));
      const unaccountedExports = runtimeExports.filter(
        (exportName) => !knownNames.has(exportName) && !ignoredExports.has(exportName),
      );
      const missingComponentExports = [...knownNames].filter(
        (componentName) => !runtimeExports.includes(componentName),
      );
      const staleIgnoredExports = [...ignoredExports].filter(
        (ignoredName) => !runtimeExports.includes(ignoredName),
      );

      if (unaccountedExports.length > 0) {
        diagnostics.push(
          diagnostic(
            "FAIL",
            "UNACCOUNTED_EXPORT",
            `Runtime exports missing catalog policy: ${unaccountedExports.join(", ")}.`,
            { fix: "Add a component entry or an explicit ignoredExports record with a reason." },
          ),
        );
      }
      if (missingComponentExports.length > 0) {
        diagnostics.push(
          diagnostic(
            "FAIL",
            "CATALOG_COMPONENT_NOT_EXPORTED",
            `Catalog components missing from the public barrel: ${missingComponentExports.join(", ")}.`,
            { fix: "Export the runtime component or remove its public catalog entry." },
          ),
        );
      }
      if (staleIgnoredExports.length > 0) {
        diagnostics.push(
          diagnostic(
            "FAIL",
            "STALE_IGNORED_EXPORT",
            `Ignored exports no longer present in the barrel: ${staleIgnoredExports.join(", ")}.`,
            { fix: "Remove stale ignoredExports records." },
          ),
        );
      }
      if (
        unaccountedExports.length === 0 &&
        missingComponentExports.length === 0 &&
        staleIgnoredExports.length === 0
      ) {
        diagnostics.push(
          diagnostic(
            "PASS",
            "EXPORT_COVERAGE_COMPLETE",
            `All ${runtimeExports.length} runtime exports are cataloged or explicitly ignored.`,
          ),
        );
      }
    }
  }

  if (!repository.fileExists(catalog.documentation.file)) {
    diagnostics.push(
      diagnostic(
        "FAIL",
        "MISSING_DOCUMENTATION",
        `Catalog documentation file not found: ${catalog.documentation.file}.`,
        { fix: "Restore the design runtime documentation or update documentation.file." },
      ),
    );
  } else {
    const actualBlock = inventoryBlockFromDocument(
      repository.readText(catalog.documentation.file),
      catalog.documentation.marker,
    );
    const expectedBlock = renderInventoryBlock(catalog);
    if (actualBlock !== expectedBlock) {
      diagnostics.push(
        diagnostic(
          "FAIL",
          "STALE_DOCUMENTATION",
          `${catalog.documentation.marker} inventory is missing or stale.`,
          {
            fix: `Replace the ${catalog.documentation.marker} marker block in ${catalog.documentation.file} with the generated inventory block.`,
          },
        ),
      );
    } else {
      diagnostics.push(
        diagnostic("PASS", "DOCUMENTATION_CURRENT", "Design runtime inventory matches the catalog."),
      );
    }
  }

  return { diagnostics, summary: summarizeDiagnostics(diagnostics) };
}
