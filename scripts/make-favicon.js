// Pads the (non-square) site logo PNG onto a transparent square canvas and
// downsamples it to a favicon-sized PNG. Uses only Node's built-in zlib —
// no image library (sharp, etc.) is installed in this project — so this is
// the tool to rerun whenever public/images/fly-logo.png is replaced with a
// new logo, rather than a favicon <link> pointing straight at the wide
// source file (which browsers stretch into their square tab-icon slot).
//
// Run: node scripts/make-favicon.js public/images/fly-logo.png public/images/favicon.png
const fs = require("fs");
const zlib = require("zlib");

const [, , inPath, outPath, targetSizeArg] = process.argv;
const targetSize = parseInt(targetSizeArg || "256", 10);

if (!inPath || !outPath) {
  console.error("Usage: node scripts/make-favicon.js <input.png> <output.png> [targetSize]");
  process.exit(1);
}

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readChunks(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error("Not a PNG file");
  const chunks = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    chunks.push({ type, data });
    off += 12 + len;
  }
  return chunks;
}

function crc32(bytes) {
  return zlib.crc32(bytes) >>> 0;
}

function writeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilter(raw, width, height, bpp) {
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  let rawOff = 0;
  for (let y = 0; y < height; y++) {
    const filterType = raw[rawOff];
    rawOff += 1;
    const rowStart = y * stride;
    const prevRowStart = (y - 1) * stride;
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[rawOff + x];
      const a = x >= bpp ? out[rowStart + x - bpp] : 0;
      const b = y > 0 ? out[prevRowStart + x] : 0;
      const c = y > 0 && x >= bpp ? out[prevRowStart + x - bpp] : 0;
      let value;
      switch (filterType) {
        case 0:
          value = rawByte;
          break;
        case 1:
          value = rawByte + a;
          break;
        case 2:
          value = rawByte + b;
          break;
        case 3:
          value = rawByte + Math.floor((a + b) / 2);
          break;
        case 4:
          value = rawByte + paeth(a, b, c);
          break;
        default:
          throw new Error(`Unsupported filter type ${filterType}`);
      }
      out[rowStart + x] = value & 0xff;
    }
    rawOff += stride;
  }
  return out;
}

function main() {
  const buf = fs.readFileSync(inPath);
  const chunks = readChunks(buf);
  const ihdr = chunks.find((c) => c.type === "IHDR").data;
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(
      `Expected 8-bit RGBA PNG, got bitDepth=${bitDepth} colorType=${colorType}`
    );
  }
  const bpp = 4;

  const idat = Buffer.concat(
    chunks.filter((c) => c.type === "IDAT").map((c) => c.data)
  );
  const rawFiltered = zlib.inflateSync(idat);
  const pixels = unfilter(rawFiltered, width, height, bpp);

  // Pad onto a transparent square canvas, logo centered with a small margin.
  const squareSize = Math.round(Math.max(width, height) * 1.15);
  const offX = Math.floor((squareSize - width) / 2);
  const offY = Math.floor((squareSize - height) / 2);
  const square = Buffer.alloc(squareSize * squareSize * bpp, 0);
  for (let y = 0; y < height; y++) {
    const srcStart = y * width * bpp;
    const dstStart = ((y + offY) * squareSize + offX) * bpp;
    pixels.copy(square, dstStart, srcStart, srcStart + width * bpp);
  }

  // Box-average downsample from squareSize -> targetSize.
  const scale = squareSize / targetSize;
  const resized = Buffer.alloc(targetSize * targetSize * bpp, 0);
  for (let oy = 0; oy < targetSize; oy++) {
    const sy0 = Math.floor(oy * scale);
    const sy1 = Math.max(sy0 + 1, Math.floor((oy + 1) * scale));
    for (let ox = 0; ox < targetSize; ox++) {
      const sx0 = Math.floor(ox * scale);
      const sx1 = Math.max(sx0 + 1, Math.floor((ox + 1) * scale));
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        n = 0;
      for (let sy = sy0; sy < sy1 && sy < squareSize; sy++) {
        for (let sx = sx0; sx < sx1 && sx < squareSize; sx++) {
          const i = (sy * squareSize + sx) * bpp;
          r += square[i];
          g += square[i + 1];
          b += square[i + 2];
          a += square[i + 3];
          n++;
        }
      }
      const o = (oy * targetSize + ox) * bpp;
      if (n > 0) {
        resized[o] = Math.round(r / n);
        resized[o + 1] = Math.round(g / n);
        resized[o + 2] = Math.round(b / n);
        resized[o + 3] = Math.round(a / n);
      }
    }
  }

  // Re-filter with filter type "None" (0) per row, then deflate.
  const stride = targetSize * bpp;
  const filtered = Buffer.alloc(targetSize * (stride + 1));
  for (let y = 0; y < targetSize; y++) {
    filtered[y * (stride + 1)] = 0;
    resized.copy(filtered, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const compressed = zlib.deflateSync(filtered, { level: 9 });

  const newIhdr = Buffer.alloc(13);
  newIhdr.writeUInt32BE(targetSize, 0);
  newIhdr.writeUInt32BE(targetSize, 4);
  newIhdr[8] = 8; // bit depth
  newIhdr[9] = 6; // color type RGBA
  newIhdr[10] = 0;
  newIhdr[11] = 0;
  newIhdr[12] = 0;

  const out = Buffer.concat([
    SIG,
    writeChunk("IHDR", newIhdr),
    writeChunk("IDAT", compressed),
    writeChunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(outPath, out);
  console.log(
    `wrote ${outPath}: ${targetSize}x${targetSize} (source ${width}x${height} padded to ${squareSize}x${squareSize})`
  );
}

main();
