#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const rawRoot = join(repoRoot, "docs/design/v1/raw");
const htmlPath = join(rawRoot, "PuppyPlan.html");
const manifestPath = join(repoRoot, "docs/design/v1/manifest.json");

const PHONE_WIDTH = 393;
const PHONE_HEIGHT = 852;

const sourceArtifactStatuses = [
  {
    path: "raw/PuppyPlan.html",
    status: "current",
    priorityTags: ["mvp"],
    notes:
      "Current visual source for implementation, manifest extraction, and screenshot export.",
  },
  {
    path: "raw/PuppyPlan - Standalone.html",
    status: "reference",
    priorityTags: ["reference"],
    notes:
      "Self-contained exported snapshot. Keep for reference; prefer PuppyPlan.html plus source modules.",
  },
  {
    path: "raw/PuppyPlan-print.html",
    status: "stale-reference",
    priorityTags: ["stale", "reference"],
    notes:
      "Print-oriented export. Do not use for current implementation unless a future manifest promotes it.",
  },
  {
    path: "raw/PuppyPlan.standalone.src.html",
    status: "stale-reference",
    priorityTags: ["stale", "reference"],
    notes:
      "Older standalone source-style export. Do not use for current implementation unless a future manifest promotes it.",
  },
  {
    path: "raw/uploads/DESIGN*.md",
    status: "sanitized-historical-snapshot",
    priorityTags: ["reference"],
    notes:
      "Sanitized historical uploaded copies. Repo root DESIGN.md remains canonical and may intentionally differ.",
  },
  {
    path: "raw/uploads/puppyplan-prd-v2.md",
    status: "sanitized-historical-snapshot",
    priorityTags: ["reference"],
    notes:
      "Sanitized historical uploaded copy. Repo root puppyplan-prd-v2.md remains canonical and may intentionally differ.",
  },
  {
    path: "raw/uploads/design-tokens*.json",
    status: "reference-duplicate",
    priorityTags: ["reference"],
    notes:
      "Historical uploaded token copies. Repo root design-tokens.json remains canonical until Phase 4.",
  },
  {
    path: "raw/uploads/STRINGS.en.json",
    status: "reference-duplicate",
    priorityTags: ["reference"],
    notes: "Historical uploaded strings copy. Repo root string files remain canonical.",
  },
  {
    path: "raw/uploads/AUDIT_FIXES*.md",
    status: "excluded",
    priorityTags: ["stale", "reference"],
    notes:
      "Historical audit markdown is intentionally excluded from raw intake. Curated statuses live in design-audit-reconciliation.md.",
  },
];

const routeBySection = {
  readme: null,
  foundation: "/_dev/components",
  onboarding: "/onboarding",
  today: "/today",
  quicklog: "/quick-log",
  timeline: "/timeline",
  family: "/family/invite",
  sitter: "/more/trusted-sitter",
  trainer: "/sharing/trainer-preview",
  cards: "/more/shareable-cards",
  revoked: "/share/unavailable",
  health: "/health",
  reminders: "/reminders",
  guidance: "/today/guidance",
  more: "/more",
  paywall: "/more/paywall",
  states: "/_dev/components/states",
};

const sourceFileBySection = {
  readme: "raw/PuppyPlan.html",
  foundation: "raw/screens/library.jsx",
  onboarding: "raw/screens/onboarding.jsx",
  today: "raw/screens/today.jsx",
  quicklog: "raw/screens/quicklog.jsx",
  timeline: "raw/screens/timeline.jsx",
  family: "raw/screens/sharing.jsx",
  sitter: "raw/screens/sitter.jsx",
  trainer: "raw/screens/sharing.jsx",
  cards: "raw/screens/cards.jsx",
  revoked: "raw/screens/sharing.jsx",
  health: "raw/screens/health.jsx",
  reminders: "raw/screens/more.jsx",
  guidance: "raw/screens/guidance.jsx",
  more: "raw/screens/more.jsx",
  paywall: "raw/screens/more.jsx",
  states: "raw/screens/states.jsx",
};

const postMvpSections = new Set(["cards", "paywall"]);
const referenceSections = new Set(["readme", "foundation", "states"]);

function repoRelative(path) {
  return relative(join(repoRoot, "docs/design/v1"), path).replaceAll("\\", "/");
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function listRawFiles(dir = rawRoot) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listRawFiles(path));
    else out.push(repoRelative(path));
  }
  return out.sort();
}

function buildComponentSourceMap() {
  const files = [
    "components.jsx",
    "design-canvas.jsx",
    "screens/cards.jsx",
    "screens/guidance.jsx",
    "screens/health.jsx",
    "screens/library.jsx",
    "screens/more.jsx",
    "screens/onboarding.jsx",
    "screens/profile.jsx",
    "screens/quicklog.jsx",
    "screens/settings.jsx",
    "screens/sharing.jsx",
    "screens/sitter.jsx",
    "screens/states.jsx",
    "screens/timeline.jsx",
    "screens/today.jsx",
  ];
  const map = new Map();
  for (const file of files) {
    const text = readText(join(rawRoot, file));
    for (const match of text.matchAll(/function\s+([A-Z][A-Za-z0-9_]*)\s*\(/g)) {
      map.set(match[1], `raw/${file}`);
    }
  }
  return map;
}

function valueForDimension(raw) {
  if (raw === "PW") return PHONE_WIDTH;
  if (raw === "PH") return PHONE_HEIGHT;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Unknown artboard dimension token: ${raw}`);
  }
  return parsed;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractComponent(body) {
  const frameMatch = body.match(/<Frame>\s*<([A-Z][A-Za-z0-9_]*)([^>]*)/);
  if (frameMatch) {
    return {
      name: frameMatch[1],
      props: parseProps(frameMatch[2] || ""),
    };
  }

  const plainMatch = body.match(/<([A-Z][A-Za-z0-9_]*)\s*\/>/);
  if (plainMatch) {
    return {
      name: plainMatch[1],
      props: {},
    };
  }

  return null;
}

function parseProps(raw) {
  const props = {};
  for (const match of raw.matchAll(/\s([A-Za-z0-9_]+)="([^"]*)"/g)) {
    props[match[1]] = match[2];
  }
  for (const match of raw.matchAll(/\s([A-Za-z0-9_]+)(?=\s|\/|>)/g)) {
    if (!props[match[1]]) props[match[1]] = true;
  }
  return props;
}

function priorityTags(sectionId) {
  if (referenceSections.has(sectionId)) return ["reference"];
  if (postMvpSections.has(sectionId)) return ["post-mvp"];
  return ["mvp"];
}

function inferStateType(label, props) {
  const normalized = label.toLowerCase();
  const explicitState = props.state && props.state !== true ? String(props.state) : null;

  if (normalized.includes("loading") || normalized.includes("skeleton")) return "loading";
  if (normalized.includes("offline")) return "offline-read";
  if (normalized.includes("pending")) return "pending-write";
  if (normalized.includes("failed")) return "failed";
  if (normalized.includes("error")) return "error";
  if (normalized.includes("empty") || normalized.includes("disabled")) return "empty";
  if (normalized.includes("duplicate")) return "duplicate-warning";
  if (normalized.includes("filled")) return "filled-form";
  if (normalized.includes("editing")) return "editing-form";
  if (normalized.includes("search")) return "search";
  if (normalized.includes("ready")) return "ready";
  if (normalized.includes("confirmed")) return "confirmed";
  if (normalized.includes("needs vet review")) return "needs-vet-review";
  if (normalized.includes("revoked") || normalized.includes("expired")) return "revoked-or-expired";
  if (normalized.includes("permission")) return "permission-denied";
  if (explicitState) return explicitState;
  if (props.filled === true) return "filled-form";
  if (props.pill) return String(props.pill);
  return "default";
}

function screenIntent(sectionTitle, artboardLabel) {
  return `${sectionTitle}: ${artboardLabel}`;
}

function routeFor(sectionId, artboardId) {
  if (sectionId === "quicklog" && artboardId === "4.6") return "/quick-log/details";
  if (sectionId === "timeline") return "/timeline";
  if (sectionId === "family" && artboardId !== "6.1") return "/family/invite";
  if (sectionId === "trainer") return "/sharing/trainer-preview";
  if (sectionId === "health" && artboardId.startsWith("11.2")) return "/health/record-edit";
  if (sectionId === "reminders" && artboardId === "12.4") return "system-notification";
  if (sectionId === "more" && artboardId.startsWith("14.2")) return "/more/puppy-profile";
  if (sectionId === "more" && artboardId === "14.3") return "/settings/quick-trackers";
  if (sectionId === "more" && artboardId === "14.4") return "/more/notifications";
  if (sectionId === "more" && artboardId === "14.5") return "/more/privacy";
  if (sectionId === "guidance") return "/today/guidance";
  return routeBySection[sectionId] ?? null;
}

function missingOrDeferredStates() {
  return [
    {
      status: "open",
      item: "Onboarding age hint artboard",
      notes:
        "Expected between profile setup and tracker picker. Not present as a dedicated current artboard.",
    },
    {
      status: "open",
      item: "Today after-accident recovery state",
      notes: "Required by PRD retention journey; not present as a dedicated current artboard.",
    },
    {
      status: "open",
      item: "Today empty and refresh-error states",
      notes: "Current canvas has loading/offline/pending but not a dedicated empty or error Today artboard.",
    },
    {
      status: "open",
      item: "Quick Log slow-network/saving state",
      notes: "Current canvas has after-tap pending and failed states but not the slow saving intermediate.",
    },
    {
      status: "open",
      item: "Reminder edit route",
      notes: "Current canvas has reminder list and lock-screen push, not /reminders/edit.",
    },
    {
      status: "open",
      item: "Notification permission-denied state",
      notes: "Current canvas has notification settings, not a dedicated denied-permission state.",
    },
    {
      status: "open",
      item: "Viewer-role read-only Today/Timeline",
      notes: "Family sharing viewer read-only surfaces are not dedicated artboards.",
    },
    {
      status: "open",
      item: "Quick Log detail forms for sleep, feeding, and zoomies",
      notes: "Current details form is generic and does not show the three specific variants.",
    },
    {
      status: "deferred",
      item: "Dynamic Type XXL/XXXL variants",
      notes: "Explicitly deferred from this Cloud Design pass; future native gallery/screenshots must cover it.",
    },
    {
      status: "deferred",
      item: "Multi-size phone canvases",
      notes:
        "Current phone artboards are 393x852 only. DESIGN calls for small iPhone, large iPhone, and common Android acceptance screenshots.",
    },
    {
      status: "deferred",
      item: "Detailed tap-target and VoiceOver annotation layers",
      notes: "Readme marks these as better suited to Figma; native primitives must enforce them later.",
    },
  ];
}

function extractManifest() {
  const html = readText(htmlPath);
  const componentSources = buildComponentSourceMap();
  const sectionMatches = [...html.matchAll(/<DCSection\s+id="([^"]+)"\s+title="([^"]+)"\s+subtitle="([^"]*)">/g)];
  const sections = [];

  for (let index = 0; index < sectionMatches.length; index += 1) {
    const match = sectionMatches[index];
    const next = sectionMatches[index + 1];
    const sectionId = match[1];
    const sectionTitle = match[2];
    const subtitle = match[3];
    const sectionHtml = html.slice(match.index, next ? next.index : html.length);
    const artboards = [];

    for (const artboardMatch of sectionHtml.matchAll(
      /<DCArtboard\s+id="([^"]+)"\s+label="([^"]+)"\s+width=\{([^}]+)\}\s+height=\{([^}]+)\}[^>]*>([\s\S]*?)(?=<\/DCArtboard>)/g,
    )) {
      const id = artboardMatch[1];
      const label = artboardMatch[2];
      const width = valueForDimension(artboardMatch[3]);
      const height = valueForDimension(artboardMatch[4]);
      const body = artboardMatch[5];
      const component = extractComponent(body);
      const componentSource = component?.name ? componentSources.get(component.name) : null;
      const kind = width === PHONE_WIDTH && height === PHONE_HEIGHT ? "phone-screen" : "reference-artboard";
      const tags = priorityTags(sectionId);
      const sourceFiles = ["raw/PuppyPlan.html"];
      const sectionSource = sourceFileBySection[sectionId];
      if (sectionSource && sectionSource !== "raw/PuppyPlan.html") sourceFiles.push(sectionSource);
      if (componentSource && !sourceFiles.includes(componentSource)) sourceFiles.push(componentSource);

      const stateType = kind === "reference-artboard" ? "reference" : inferStateType(label, component?.props ?? {});

      artboards.push({
        id,
        slug: `${slugify(sectionId)}__${slugify(id)}`,
        label,
        title: label.replace(/^\d+(?:\.\d+)?\s*/, ""),
        sectionId,
        sectionTitle,
        route: routeFor(sectionId, id),
        screenIntent: screenIntent(sectionTitle, label),
        stateType,
        priorityTags: tags,
        kind,
        dimensions: {
          width,
          height,
          unit: "px",
        },
        sourceFiles,
        component,
        screenshotPath: `screenshots/${slugify(sectionId)}/${slugify(id)}.png`,
        knownIssues: [],
      });
    }

    sections.push({
      id: sectionId,
      title: sectionTitle,
      subtitle,
      sourceFile: sourceFileBySection[sectionId] ?? "raw/PuppyPlan.html",
      priorityTags: priorityTags(sectionId),
      artboards,
    });
  }

  const artboards = sections.flatMap((section) => section.artboards);
  const phoneScreens = artboards.filter((artboard) => artboard.kind === "phone-screen");

  return {
    schema: "puppyplan.design-manifest.v1",
    linearIssue: "PUP-7",
    status: "current",
    source: {
      currentVisualSource: "raw/PuppyPlan.html",
      currentVisualSourceReason:
        "It contains the broadest and newest screen set in the Cloud Design export.",
      renderRequiresNetwork: true,
      ciGateEligible: false,
      ciGateBlockers: [
        "Vendor React, ReactDOM, and Babel into docs/design/v1/raw/_vendor/ before CI use.",
        "Keep Linux Chrome/Chromium discovery supported on the target runner before CI use.",
      ],
      networkDependencies: [
        "https://unpkg.com/react@18.3.1/umd/react.development.js",
        "https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js",
        "https://unpkg.com/@babel/standalone@7.29.0/babel.min.js",
      ],
      rawFiles: listRawFiles(),
      artifacts: sourceArtifactStatuses,
    },
    counts: {
      expectedSections: 17,
      expectedArtboards: 65,
      expectedPhoneScreens: 62,
      sections: sections.length,
      artboards: artboards.length,
      phoneScreens: phoneScreens.length,
      referenceArtboards: artboards.length - phoneScreens.length,
      reconciliation:
        sections.length === 17 && artboards.length === 65 && phoneScreens.length === 62
          ? "Matches observed PUP-7 baseline: 17 sections, 65 artboards, 62 phone screens."
          : "Does not match observed PUP-7 baseline; inspect sections/artboards before Phase 3 export.",
    },
    defaults: {
      phoneArtboard: {
        width: PHONE_WIDTH,
        height: PHONE_HEIGHT,
        unit: "px",
      },
      implementationTarget:
        "Expo native mobile app using future src/design primitives, not copied web JSX.",
    },
    sections,
    missingOrDeferredStates: missingOrDeferredStates(),
    changelog: [
      {
        date: "2026-05-22",
        change:
          "Generated manifest from current raw/PuppyPlan.html with 17 sections, 65 artboards, and 62 phone screens.",
      },
    ],
  };
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function main() {
  const mode = process.argv[2] ?? "--print";
  const manifest = extractManifest();
  const json = stableJson(manifest);

  if (mode === "--write") {
    writeFileSync(manifestPath, json);
    console.log(`Wrote ${repoRelative(manifestPath)}`);
    console.log(
      `sections=${manifest.counts.sections} artboards=${manifest.counts.artboards} phoneScreens=${manifest.counts.phoneScreens}`,
    );
    return;
  }

  if (mode === "--check") {
    const existing = readText(manifestPath);
    if (existing !== json) {
      console.error("docs/design/v1/manifest.json is not up to date.");
      process.exitCode = 1;
      return;
    }
    console.log(
      `manifest ok: sections=${manifest.counts.sections} artboards=${manifest.counts.artboards} phoneScreens=${manifest.counts.phoneScreens}`,
    );
    return;
  }

  process.stdout.write(json);
}

main();
