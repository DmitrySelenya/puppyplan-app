import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;
  return upLeft;
}

function channelsFor(colorType) {
  if (colorType === 2) return 3;
  if (colorType === 6) return 4;
  return null;
}

function parseChunks(buffer) {
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error("Invalid PNG signature.");
  }

  const chunks = [];
  let offset = PNG_SIGNATURE.length;

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    chunks.push({
      type,
      data: buffer.subarray(dataStart, dataEnd),
    });

    offset = dataEnd + 4;
    if (type === "IEND") break;
  }

  return chunks;
}

function analyzePixels({ width, height, bitDepth, colorType, idat }) {
  const channels = channelsFor(colorType);
  if (bitDepth !== 8 || !channels || idat.length === 0) {
    return {
      supportedPixelAnalysis: false,
      uniqueColorSamples: 0,
      visibleSamples: 0,
      nonblank: null,
    };
  }

  const inflated = inflateSync(Buffer.concat(idat));
  const bytesPerPixel = channels;
  const rowBytes = width * channels;
  const totalPixels = width * height;
  const sampleEvery = Math.max(1, Math.floor(totalPixels / 100000));
  let sourceOffset = 0;
  let previous = Buffer.alloc(rowBytes);
  let visibleSamples = 0;
  let sampledPixels = 0;
  const uniqueColors = new Set();

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const row = Buffer.alloc(rowBytes);

    for (let i = 0; i < rowBytes; i += 1) {
      const raw = inflated[sourceOffset];
      sourceOffset += 1;

      const left = i >= bytesPerPixel ? row[i - bytesPerPixel] : 0;
      const up = previous[i] ?? 0;
      const upLeft = i >= bytesPerPixel ? previous[i - bytesPerPixel] : 0;

      if (filter === 0) {
        row[i] = raw;
      } else if (filter === 1) {
        row[i] = (raw + left) & 0xff;
      } else if (filter === 2) {
        row[i] = (raw + up) & 0xff;
      } else if (filter === 3) {
        row[i] = (raw + Math.floor((left + up) / 2)) & 0xff;
      } else if (filter === 4) {
        row[i] = (raw + paeth(left, up, upLeft)) & 0xff;
      } else {
        throw new Error(`Unsupported PNG row filter: ${filter}.`);
      }
    }

    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      if (pixelIndex % sampleEvery !== 0) continue;

      const offset = x * channels;
      const alpha = channels === 4 ? row[offset + 3] : 255;
      const key =
        channels === 4
          ? `${row[offset]},${row[offset + 1]},${row[offset + 2]},${alpha}`
          : `${row[offset]},${row[offset + 1]},${row[offset + 2]},255`;

      sampledPixels += 1;
      if (alpha > 0) visibleSamples += 1;
      if (uniqueColors.size < 1000) uniqueColors.add(key);
    }

    previous = row;
  }

  return {
    supportedPixelAnalysis: true,
    sampledPixels,
    uniqueColorSamples: uniqueColors.size,
    visibleSamples,
    nonblank: visibleSamples > 0 && uniqueColors.size > 1,
  };
}

export function readPngInfo(buffer) {
  const chunks = parseChunks(buffer);
  const ihdr = chunks.find((chunk) => chunk.type === "IHDR");
  if (!ihdr) throw new Error("PNG is missing IHDR.");

  const width = ihdr.data.readUInt32BE(0);
  const height = ihdr.data.readUInt32BE(4);
  const bitDepth = ihdr.data[8];
  const colorType = ihdr.data[9];
  const idat = chunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data);
  const pixelAnalysis = analyzePixels({ width, height, bitDepth, colorType, idat });

  return {
    width,
    height,
    bitDepth,
    colorType,
    byteLength: buffer.length,
    ...pixelAnalysis,
  };
}

export function assertPngMatches(buffer, expected, label) {
  const info = readPngInfo(buffer);
  if (info.width !== expected.width || info.height !== expected.height) {
    throw new Error(
      `${label} has dimensions ${info.width}x${info.height}; expected ${expected.width}x${expected.height}.`,
    );
  }
  if (!info.supportedPixelAnalysis) {
    throw new Error(
      `${label} uses unsupported PNG encoding (bitDepth=${info.bitDepth}, colorType=${info.colorType}). Expected 8-bit truecolor RGB/RGBA output.`,
    );
  }
  if (info.nonblank !== true) {
    throw new Error(
      `${label} did not pass nonblank pixel analysis (unique samples: ${info.uniqueColorSamples}).`,
    );
  }
  return info;
}
