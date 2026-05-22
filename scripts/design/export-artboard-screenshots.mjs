#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { assertPngMatches } from "./lib/png.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const designRoot = join(repoRoot, "docs/design/v1");
const rawRoot = join(designRoot, "raw");
const manifestPath = join(designRoot, "manifest.json");
const screenshotsRoot = join(designRoot, "screenshots");
const currentSource = "PuppyPlan.html";
const expectedArtboards = 65;
const renderTimeoutMs = 90000;

const mimeByExtension = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jsx": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
};

function repoRelative(path) {
  return relative(repoRoot, path).replaceAll("\\", "/");
}

function designRelative(path) {
  return relative(designRoot, path).replaceAll("\\", "/");
}

function readManifest() {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function artboardsFrom(manifest) {
  return manifest.sections.flatMap((section) => section.artboards);
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function removeExistingPngs(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readDirRecursive(dir)) {
    if (entry.endsWith(".png")) rmSync(entry, { force: true });
  }
}

function readDirRecursive(dir) {
  const out = [];
  for (const entry of readFileEntries(dir)) {
    if (entry.isDirectory) out.push(...readDirRecursive(entry.path));
    else out.push(entry.path);
  }
  return out;
}

function readFileEntries(dir) {
  return existsSync(dir)
    ? Array.from(readdirSync(dir, { withFileTypes: true }), (entry) => ({
        path: join(dir, entry.name),
        isDirectory: entry.isDirectory(),
      }))
    : [];
}

function extensionFor(path) {
  const name = basename(path);
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot);
}

function startStaticServer(root) {
  const absoluteRoot = resolve(root);
  const server = createServer((request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const requestPath = url.pathname === "/" ? `/${currentSource}` : url.pathname;
      const decoded = decodeURIComponent(requestPath);
      const filePath = resolve(absoluteRoot, `.${decoded}`);
      const relativePath = relative(absoluteRoot, filePath);

      if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      if (!existsSync(filePath)) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      const extension = extensionFor(filePath);
      response.writeHead(200, {
        "content-type": mimeByExtension[extension] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(readFileSync(filePath));
    } catch (error) {
      response.writeHead(500);
      response.end(error.message);
    }
  });

  return new Promise((resolvePromise, rejectPromise) => {
    server.on("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolvePromise({
        server,
        url: `http://127.0.0.1:${address.port}/${currentSource}`,
      });
    });
  });
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/opt/google/chrome/chrome",
    "/opt/chromium.org/chromium/chromium",
  ].filter(Boolean);

  const chrome = candidates.find((candidate) => existsSync(candidate));
  if (!chrome) {
    throw new Error(
      "No Chrome-compatible browser found. Set CHROME_PATH to a Chrome, Chromium, or Edge executable. The built-in search covers common macOS and Linux paths.",
    );
  }
  return chrome;
}

function delay(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

async function launchChrome() {
  const userDataDir = await mkdtemp(join(tmpdir(), "puppyplan-design-chrome-"));
  const debuggingPort = await findFreePort();
  const chrome = findChrome();
  const child = spawn(
    chrome,
    [
      "--headless=new",
      `--remote-debugging-port=${debuggingPort}`,
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--hide-scrollbars",
      "--window-size=1800,5200",
      "about:blank",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  try {
    const browserWsUrl = await waitForDevTools(child, debuggingPort);

    return {
      browserWsUrl,
      child,
      userDataDir,
    };
  } catch (error) {
    child.kill("SIGTERM");
    await rm(userDataDir, { recursive: true, force: true });
    throw error;
  }
}

function findFreePort() {
  return new Promise((resolvePromise, rejectPromise) => {
    const server = createTcpServer();
    server.on("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address.port;
      server.close(() => resolvePromise(port));
    });
  });
}

async function waitForDevTools(child, debuggingPort) {
  const started = Date.now();
  let output = "";
  let exitCode = null;
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.on("exit", (code) => {
    exitCode = code;
  });

  while (Date.now() - started < 30000) {
    if (exitCode !== null) {
      throw new Error(`Chrome exited before DevTools was ready with code ${exitCode}.\n${output}`);
    }

    try {
      const response = await fetch(`http://127.0.0.1:${debuggingPort}/json/version`);
      if (response.ok) {
        const version = await response.json();
        if (version.webSocketDebuggerUrl) return version.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome is still starting.
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for Chrome DevTools endpoint on ${debuggingPort}.\n${output}`);
}

async function createPageWebSocket(browserWsUrl) {
  const endpoint = new URL(browserWsUrl);
  const targetUrl = `http://${endpoint.host}/json/new?${encodeURIComponent("about:blank")}`;
  let response = await fetch(targetUrl, { method: "PUT" });
  if (!response.ok) response = await fetch(targetUrl);
  if (!response.ok) {
    throw new Error(`Could not create Chrome target: ${response.status} ${response.statusText}`);
  }
  const target = await response.json();
  if (!target.webSocketDebuggerUrl) {
    throw new Error("Chrome target did not return a page WebSocket URL.");
  }
  return target.webSocketDebuggerUrl;
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket.addEventListener("message", (event) => {
      this.handleMessage(event.data);
    });
    this.socket.addEventListener("close", () => {
      for (const { reject } of this.pending.values()) {
        reject(new Error("Chrome DevTools socket closed."));
      }
      this.pending.clear();
    });
  }

  handleMessage(data) {
    const message = JSON.parse(data);
    if (message.id && this.pending.has(message.id)) {
      const { resolve: resolvePromise, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message}: ${message.error.data ?? ""}`));
      else resolvePromise(message.result ?? {});
      return;
    }

    if (message.method && this.listeners.has(message.method)) {
      for (const listener of this.listeners.get(message.method)) {
        listener(message.params ?? {});
      }
    }
  }

  send(method, params = {}) {
    this.id += 1;
    const id = this.id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
    });
  }

  once(method, timeoutMs = 30000) {
    return new Promise((resolvePromise, reject) => {
      const timeout = setTimeout(() => {
        this.off(method, listener);
        reject(new Error(`Timed out waiting for ${method}.`));
      }, timeoutMs);
      const listener = (params) => {
        clearTimeout(timeout);
        this.off(method, listener);
        resolvePromise(params);
      };
      this.on(method, listener);
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? new Set();
    listeners.add(listener);
    this.listeners.set(method, listeners);
  }

  off(method, listener) {
    const listeners = this.listeners.get(method);
    if (!listeners) return;
    listeners.delete(listener);
    if (listeners.size === 0) this.listeners.delete(method);
  }

  close() {
    this.socket.close();
  }
}

function connectWebSocket(url) {
  if (typeof WebSocket === "undefined") {
    throw new Error("This script requires the Node.js WebSocket global available in Node 22+.");
  }

  return new Promise((resolvePromise, reject) => {
    const socket = new WebSocket(url);
    socket.addEventListener("open", () => resolvePromise(new CdpClient(socket)));
    socket.addEventListener("error", () => reject(new Error(`Could not connect to ${url}`)));
  });
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text ??
        "Runtime evaluation failed.",
    );
  }

  return result.result.value;
}

async function waitForArtboards(cdp, count) {
  const started = Date.now();
  let lastResult = null;

  while (Date.now() - started < renderTimeoutMs) {
    lastResult = await evaluate(
      cdp,
      `(() => {
        const slots = document.querySelectorAll("[data-dc-slot] .dc-card").length;
        return {
          ok: slots >= ${count},
          slots,
          readyState: document.readyState,
          title: document.title,
          bodyTextLength: document.body ? document.body.innerText.length : 0
        };
      })()`,
    );

    if (lastResult.ok) return lastResult;
    await delay(500);
  }

  throw new Error(
    `Timed out waiting for ${count} artboards. Last page state: ${JSON.stringify(lastResult)}`,
  );
}

function selectorExpression(sectionId, artboardId) {
  return `(() => {
    const sectionId = ${JSON.stringify(sectionId)};
    const artboardId = ${JSON.stringify(artboardId)};
    const selector = '[data-dc-section="' + sectionId.replace(/"/g, '\\\\"') + '"] [data-dc-slot="' + artboardId.replace(/"/g, '\\\\"') + '"] .dc-card';
    const card = document.querySelector(selector);
    if (!card) return { ok: false, error: 'Missing artboard selector: ' + selector };
    card.scrollIntoView({ block: 'center', inline: 'center' });
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        resolve({
          ok: true,
          rect: {
            x: rect.x + window.scrollX,
            y: rect.y + window.scrollY,
            width: rect.width,
            height: rect.height
          },
          textLength: card.innerText.length
        });
      }));
    });
  })()`;
}

async function captureArtboard(cdp, artboard) {
  const info = await evaluate(cdp, selectorExpression(artboard.sectionId, artboard.id));
  if (!info.ok) throw new Error(info.error);

  const expectedWidth = artboard.dimensions.width;
  const expectedHeight = artboard.dimensions.height;
  if (Math.round(info.rect.width) !== expectedWidth || Math.round(info.rect.height) !== expectedHeight) {
    throw new Error(
      `${artboard.slug} has DOM dimensions ${info.rect.width}x${info.rect.height}; expected ${expectedWidth}x${expectedHeight}.`,
    );
  }

  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: {
      x: info.rect.x,
      y: info.rect.y,
      width: info.rect.width,
      height: info.rect.height,
      scale: 1,
    },
  });

  const buffer = Buffer.from(screenshot.data, "base64");
  assertPngMatches(
    buffer,
    {
      width: expectedWidth,
      height: expectedHeight,
    },
    artboard.screenshotPath,
  );
  return buffer;
}

function buildIndex(manifest) {
  const lines = [
    "# PuppyPlan Design Screenshot Atlas",
    "",
    "Generated from `docs/design/v1/raw/PuppyPlan.html` by `scripts/design/export-artboard-screenshots.mjs`.",
    "Validate with `node scripts/design/check-design-package.mjs`.",
    "",
    "The screenshots use synthetic design data only and are visual references for future Expo native implementation.",
    "",
    "## Summary",
    "",
    `- Sections: ${manifest.counts.sections}`,
    `- Artboards: ${manifest.counts.artboards}`,
    `- Phone screens: ${manifest.counts.phoneScreens}`,
    `- Reference artboards: ${manifest.counts.referenceArtboards}`,
    "",
  ];

  for (const section of manifest.sections) {
    lines.push(`## ${section.title}`, "");
    lines.push("| Artboard | State | Dimensions | Screenshot |");
    lines.push("| --- | --- | --- | --- |");
    for (const artboard of section.artboards) {
      const imagePath = relative(screenshotsRoot, join(designRoot, artboard.screenshotPath)).replaceAll("\\", "/");
      lines.push(
        `| ${artboard.label} | ${artboard.stateType} | ${artboard.dimensions.width}x${artboard.dimensions.height} | ![${artboard.label}](${imagePath}) |`,
      );
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

async function main() {
  const manifest = readManifest();
  if (manifest.source?.ciGateEligible === false) {
    console.warn(
      "This export is a local/manual tool, not a CI gate, until manifest.source.ciGateBlockers are resolved.",
    );
  }

  const artboards = artboardsFrom(manifest);
  if (artboards.length !== expectedArtboards) {
    throw new Error(`Expected ${expectedArtboards} artboards, found ${artboards.length}.`);
  }

  const { server, url } = await startStaticServer(rawRoot);
  const chrome = await launchChrome();
  let cdp = null;

  try {
    const pageWsUrl = await createPageWebSocket(chrome.browserWsUrl);
    cdp = await connectWebSocket(pageWsUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Log.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1800,
      height: 5200,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const loadEvent = cdp.once("Page.loadEventFired", 60000).catch(() => null);
    await cdp.send("Page.navigate", { url });
    await loadEvent;
    const ready = await waitForArtboards(cdp, artboards.length);
    console.log(`render ok: slots=${ready.slots} source=${url}`);

    ensureDir(screenshotsRoot);
    removeExistingPngs(screenshotsRoot);

    for (const artboard of artboards) {
      const outputPath = join(designRoot, artboard.screenshotPath);
      ensureDir(dirname(outputPath));
      const buffer = await captureArtboard(cdp, artboard);
      writeFileSync(outputPath, buffer);
      console.log(`wrote ${designRelative(outputPath)}`);
    }

    writeFileSync(join(screenshotsRoot, "index.md"), buildIndex(manifest));
    console.log(`wrote ${repoRelative(join(screenshotsRoot, "index.md"))}`);
    console.log(`screenshot export ok: artboards=${artboards.length}`);
  } finally {
    if (cdp) cdp.close();
    server.close();
    chrome.child.kill("SIGTERM");
    await rm(chrome.userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
