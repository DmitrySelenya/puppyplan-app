#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { assertPngMatches } from "./lib/png.mjs";
import {
  forbiddenTextPatterns,
  isAllowedEmailPlaceholder,
  textFileExtensions,
  textPolicyRoots,
} from "./lib/policy.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const designRoot = join(repoRoot, "docs/design/v1");
const rawRoot = join(designRoot, "raw");
const screenshotsRoot = join(designRoot, "screenshots");
const manifestPath = join(designRoot, "manifest.json");

function repoRelative(path) {
  return relative(repoRoot, path).replaceAll("\\", "/");
}

function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(path));
    else out.push(path);
  }
  return out.sort();
}

function extensionFor(path) {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot);
}

function lineNumberFor(text, index) {
  return text.slice(0, index).split("\n").length;
}

function readManifest() {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function artboardsFrom(manifest) {
  return manifest.sections.flatMap((section) => section.artboards);
}

function runManifestCheck() {
  return execFileSync(process.execPath, [join(repoRoot, "scripts/design/extract-artboards.mjs"), "--check"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function findAuditFixes() {
  return walkFiles(rawRoot).filter((path) => /AUDIT_FIXES.*\.md$/.test(path));
}

function textPolicyFiles() {
  const files = [];

  for (const root of textPolicyRoots(repoRoot)) {
    if (!existsSync(root.path)) {
      continue;
    }

    const stat = statSync(root.path);
    if (stat.isDirectory()) {
      files.push(...walkFiles(root.path));
    } else if (stat.isFile()) {
      files.push(root.path);
    }
  }

  return [...new Set(files)]
    .filter((path) => textFileExtensions.has(extensionFor(path)))
    .sort();
}

function checkTextPolicy() {
  const files = textPolicyFiles();
  const errors = [];
  const emailPattern = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

  for (const file of files) {
    const text = readFileSync(file, "utf8");

    for (const { pattern, reason } of forbiddenTextPatterns) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        errors.push(
          `${repoRelative(file)}:${lineNumberFor(text, match.index ?? 0)} ${reason}: ${match[0]}`,
        );
      }
    }

    for (const match of text.matchAll(emailPattern)) {
      const email = match[0].toLowerCase();
      if (isAllowedEmailPlaceholder(email)) {
        continue;
      }

      errors.push(
        `${repoRelative(file)}:${lineNumberFor(text, match.index ?? 0)} email placeholders must use example.test: ${match[0]}`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Repo design text policy failed:\n${errors.join("\n")}`);
  }

  return files.length;
}

function checkScreenshots(manifest) {
  const artboards = artboardsFrom(manifest);
  const expectedPaths = new Map(
    artboards.map((artboard) => [join(designRoot, artboard.screenshotPath), artboard]),
  );
  const actualPngs = walkFiles(screenshotsRoot).filter((path) => path.endsWith(".png"));
  const errors = [];
  let totalBytes = 0;

  for (const artboard of artboards) {
    const absolutePath = join(designRoot, artboard.screenshotPath);
    if (!existsSync(absolutePath)) {
      errors.push(`Missing screenshot: ${repoRelative(absolutePath)}`);
      continue;
    }

    try {
      const buffer = readFileSync(absolutePath);
      totalBytes += statSync(absolutePath).size;
      assertPngMatches(
        buffer,
        {
          width: artboard.dimensions.width,
          height: artboard.dimensions.height,
        },
        repoRelative(absolutePath),
      );
    } catch (error) {
      errors.push(error.message);
    }
  }

  for (const png of actualPngs) {
    if (!expectedPaths.has(png)) {
      errors.push(`Unexpected screenshot: ${repoRelative(png)}`);
    }
  }

  if (!existsSync(join(screenshotsRoot, "index.md"))) {
    errors.push("Missing screenshot index: docs/design/v1/screenshots/index.md");
  }

  if (actualPngs.length !== artboards.length) {
    errors.push(`Screenshot count is ${actualPngs.length}; expected ${artboards.length}.`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  return {
    artboards: artboards.length,
    screenshots: actualPngs.length,
    totalBytes,
  };
}

function main() {
  const manifestCheck = runManifestCheck();
  const auditFixes = findAuditFixes();
  if (auditFixes.length > 0) {
    throw new Error(
      `AUDIT_FIXES markdown must stay excluded:\n${auditFixes.map(repoRelative).join("\n")}`,
    );
  }

  const manifest = readManifest();
  const textFileCount = checkTextPolicy();
  const screenshotCheck = checkScreenshots(manifest);

  console.log(manifestCheck);
  console.log("raw audit exclusions ok: 0 AUDIT_FIXES markdown files");
  console.log(`repo design text policy ok: ${textFileCount} text files scanned`);
  console.log(
    `screenshots ok: artboards=${screenshotCheck.artboards} screenshots=${screenshotCheck.screenshots} totalBytes=${screenshotCheck.totalBytes}`,
  );
}

main();
