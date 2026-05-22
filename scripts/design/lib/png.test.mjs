import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";

import { assertPngMatches } from "./png.mjs";

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value);
  return buffer;
}

function chunk(type, data = Buffer.alloc(0)) {
  return Buffer.concat([uint32(data.length), Buffer.from(type, "ascii"), data, Buffer.alloc(4)]);
}

function rgbaPng(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const rows = [];
  for (let y = 0; y < height; y += 1) {
    rows.push(Buffer.from([0]));
    rows.push(Buffer.from(pixels.slice(y * width * 4, (y + 1) * width * 4)));
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND"),
  ]);
}

test("assertPngMatches rejects a 1x1 white PNG as blank", () => {
  const white = rgbaPng(1, 1, [255, 255, 255, 255]);

  assert.throws(
    () => assertPngMatches(white, { width: 1, height: 1 }, "white.png"),
    /white\.png did not pass nonblank pixel analysis/,
  );
});

test("assertPngMatches rejects a PNG with unexpected dimensions", () => {
  const twoPixel = rgbaPng(2, 1, [255, 255, 255, 255, 0, 0, 0, 255]);

  assert.throws(
    () => assertPngMatches(twoPixel, { width: 1, height: 1 }, "two-pixel.png"),
    /two-pixel\.png has dimensions 2x1; expected 1x1/,
  );
});

test("assertPngMatches rejects unsupported PNG encodings with a clear error", () => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 16;
  ihdr[9] = 6;
  const unsupported = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IEND"),
  ]);

  assert.throws(
    () => assertPngMatches(unsupported, { width: 1, height: 1 }, "unsupported.png"),
    /unsupported\.png uses unsupported PNG encoding/,
  );
});
