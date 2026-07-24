import { Buffer } from "node:buffer";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function writeFileIfChanged(filePath, data, options) {
  const next = Buffer.isBuffer(data)
    ? data
    : Buffer.from(data, getEncoding(options));
  const current = existsSync(filePath) ? readFileSync(filePath) : null;

  if (current?.equals(next)) {
    return false;
  }

  if (current && isPng(current) && isPng(next) && pngPixelsEqual(current, next, filePath)) {
    return false;
  }

  writeFileSync(filePath, data, options);
  return true;
}

function getEncoding(options) {
  if (typeof options === "string") {
    return options;
  }

  return options?.encoding ?? "utf8";
}

function isPng(buffer) {
  return buffer.length >= PNG_SIGNATURE.length
    && buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

function pngPixelsEqual(current, next, filePath) {
  const currentImage = decodeRgbaPng(current, `${filePath} current PNG`);
  const nextImage = decodeRgbaPng(next, `${filePath} generated PNG`);

  return currentImage.width === nextImage.width
    && currentImage.height === nextImage.height
    && currentImage.data.equals(nextImage.data);
}

function decodeRgbaPng(buffer, label) {
  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let compression = 0;
  let filter = 0;
  let interlace = 0;
  const idat = [];

  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) {
      throw new Error(`${label} has a truncated PNG chunk.`);
    }

    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const nextOffset = dataEnd + 4;

    if (nextOffset > buffer.length) {
      throw new Error(`${label} has a truncated ${type} chunk.`);
    }

    const chunkData = buffer.subarray(dataStart, dataEnd);
    offset = nextOffset;

    if (type === "IHDR") {
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
      bitDepth = chunkData[8];
      colorType = chunkData[9];
      compression = chunkData[10];
      filter = chunkData[11];
      interlace = chunkData[12];
    } else if (type === "IDAT") {
      idat.push(chunkData);
    } else if (type === "IEND") {
      break;
    }
  }

  if (width <= 0 || height <= 0) {
    throw new Error(`${label} is missing a valid IHDR chunk.`);
  }

  if (bitDepth !== 8 || colorType !== 6 || compression !== 0 || filter !== 0 || interlace !== 0) {
    throw new Error(`${label} must be an 8-bit RGBA PNG with no interlace.`);
  }

  const rowBytes = width * 4;
  const inflated = inflateSync(Buffer.concat(idat));
  const expectedLength = (rowBytes + 1) * height;

  if (inflated.length !== expectedLength) {
    throw new Error(`${label} has unexpected decoded PNG data length.`);
  }

  return {
    width,
    height,
    data: unfilterRgbaScanlines(inflated, width, height),
  };
}

function unfilterRgbaScanlines(input, width, height) {
  const bytesPerPixel = 4;
  const rowBytes = width * bytesPerPixel;
  const output = Buffer.alloc(rowBytes * height);
  let inputOffset = 0;
  let outputOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filterType = input[inputOffset];
    inputOffset += 1;

    for (let x = 0; x < rowBytes; x += 1) {
      const raw = input[inputOffset + x];
      const left = x >= bytesPerPixel ? output[outputOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? output[outputOffset + x - rowBytes] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel
        ? output[outputOffset + x - rowBytes - bytesPerPixel]
        : 0;

      if (filterType === 0) {
        output[outputOffset + x] = raw;
      } else if (filterType === 1) {
        output[outputOffset + x] = (raw + left) & 0xff;
      } else if (filterType === 2) {
        output[outputOffset + x] = (raw + up) & 0xff;
      } else if (filterType === 3) {
        output[outputOffset + x] = (raw + Math.floor((left + up) / 2)) & 0xff;
      } else if (filterType === 4) {
        output[outputOffset + x] = (raw + paeth(left, up, upLeft)) & 0xff;
      } else {
        throw new Error(`Unsupported PNG row filter: ${filterType}`);
      }
    }

    inputOffset += rowBytes;
    outputOffset += rowBytes;
  }

  return output;
}

function paeth(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);

  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}
