import { Buffer } from "node:buffer";
import console from "node:console";
import {
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateRawSync } from "node:zlib";
import { buildQuickUiAssets } from "./build-quick-ui-assets.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const INBOX_DIR_NAME = "qUIck-inbox";
const QUICK_UI_DIR = path.join("assets", "quick-ui");
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const MAX_ENTRY_COUNT = 10_000;
const MAX_ENTRY_SIZE = 256 * 1024 * 1024;
const MAX_TOTAL_SIZE = 1024 * 1024 * 1024;
const CRC_TABLE = makeCrcTable();

export async function importQuickUiExports(options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? DEFAULT_PROJECT_ROOT);
  const inboxDir = path.resolve(projectRoot, options.inboxDir ?? INBOX_DIR_NAME);
  const quickUiDir = path.resolve(
    projectRoot,
    options.quickUiDir ?? QUICK_UI_DIR,
  );
  const buildAssets = options.buildAssets ?? (() => buildQuickUiAssets({
    rootDir: projectRoot,
  }));
  const archiveNames = (await readdir(inboxDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".zip"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  if (archiveNames.length === 0) {
    throw new Error(`No qUIck export ZIP found in ${inboxDir}`);
  }

  const plannedFiles = new Map();
  const importedDocuments = [];

  for (const archiveName of archiveNames) {
    const archivePath = path.join(inboxDir, archiveName);
    const archiveEntries = readZipEntries(await readFile(archivePath), archiveName);
    const archiveFiles = new Map();

    for (const entry of archiveEntries) {
      const mapped = mapArchiveEntry(entry.name, archiveName);
      if (!mapped || mapped.archivePath === "assets/ui/manifest.json") {
        continue;
      }

      const existing = plannedFiles.get(mapped.relativePath);
      if (existing && !existing.bytes.equals(entry.bytes)) {
        throw new Error(
          `Conflicting qUIck files target ${mapped.relativePath} in `
          + `${existing.archiveName} and ${archiveName}. Keep only the ZIP(s) you want to import.`,
        );
      }

      const planned = {
        archiveName,
        bytes: entry.bytes,
        relativePath: mapped.relativePath,
      };
      plannedFiles.set(mapped.relativePath, existing ?? planned);
      archiveFiles.set(mapped.archivePath, entry.bytes);
    }

    const documents = validateArchiveDocuments({
      archiveFiles,
      archiveName,
    });
    importedDocuments.push(...documents);
  }

  if (importedDocuments.length === 0) {
    throw new Error("The qUIck ZIP(s) contain no generated-ui/*.json dialog or screen exports.");
  }

  for (const file of plannedFiles.values()) {
    const destination = resolveContainedPath(quickUiDir, file.relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, file.bytes);
  }

  const buildResult = await buildAssets();

  for (const archiveName of archiveNames) {
    await unlink(path.join(inboxDir, archiveName));
  }

  return {
    archives: archiveNames,
    buildResult,
    documents: importedDocuments,
    files: plannedFiles.size,
    quickUiDir,
    inboxDir,
  };
}

function readZipEntries(buffer, archiveName) {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const diskNumber = buffer.readUInt16LE(eocdOffset + 4);
  const centralDirectoryDisk = buffer.readUInt16LE(eocdOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(eocdOffset + 8);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);

  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== entryCount) {
    throw new Error(`${archiveName} is a multi-disk ZIP, which qUIck imports do not support.`);
  }
  if (entryCount === 0xffff || centralDirectorySize === 0xffffffff || centralDirectoryOffset === 0xffffffff) {
    throw new Error(`${archiveName} uses ZIP64, which is not expected for a qUIck export.`);
  }
  if (entryCount > MAX_ENTRY_COUNT) {
    throw new Error(`${archiveName} contains too many files (${entryCount}).`);
  }
  if (centralDirectoryOffset + centralDirectorySize > eocdOffset) {
    throw new Error(`${archiveName} has an invalid central directory.`);
  }

  const entries = [];
  let offset = centralDirectoryOffset;
  let totalSize = 0;

  for (let index = 0; index < entryCount; index += 1) {
    assertAvailable(buffer, offset, 46, archiveName);
    if (buffer.readUInt32LE(offset) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error(`${archiveName} has an invalid central directory entry.`);
    }

    const flags = buffer.readUInt16LE(offset + 8);
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const expectedCrc = buffer.readUInt32LE(offset + 16);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const entryLength = 46 + nameLength + extraLength + commentLength;
    assertAvailable(buffer, offset, entryLength, archiveName);

    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    offset += entryLength;

    if (name.endsWith("/")) {
      continue;
    }
    if ((flags & 0x1) !== 0) {
      throw new Error(`${archiveName} contains an encrypted file: ${name}`);
    }
    if (![0, 8].includes(compressionMethod)) {
      throw new Error(`${archiveName} uses unsupported ZIP compression method ${compressionMethod}: ${name}`);
    }
    if (uncompressedSize > MAX_ENTRY_SIZE) {
      throw new Error(`${archiveName} contains an oversized file: ${name}`);
    }

    totalSize += uncompressedSize;
    if (totalSize > MAX_TOTAL_SIZE) {
      throw new Error(`${archiveName} expands beyond the ${MAX_TOTAL_SIZE} byte import limit.`);
    }

    assertAvailable(buffer, localHeaderOffset, 30, archiveName);
    if (buffer.readUInt32LE(localHeaderOffset) !== LOCAL_FILE_SIGNATURE) {
      throw new Error(`${archiveName} has an invalid local file header: ${name}`);
    }

    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    assertAvailable(buffer, dataOffset, compressedSize, archiveName);
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    const bytes = compressionMethod === 0 ? Buffer.from(compressed) : inflateRawSync(compressed);

    if (bytes.length !== uncompressedSize) {
      throw new Error(`${archiveName} has an invalid uncompressed size for ${name}.`);
    }
    if (crc32(bytes) !== expectedCrc) {
      throw new Error(`${archiveName} failed its CRC check for ${name}.`);
    }

    entries.push({ bytes, name });
  }

  return entries;
}

function findEndOfCentralDirectory(buffer) {
  const minimumLength = 22;
  if (buffer.length < minimumLength) {
    throw new Error("The qUIck export is not a valid ZIP file.");
  }

  const firstPossibleOffset = Math.max(0, buffer.length - minimumLength - 0xffff);
  for (let offset = buffer.length - minimumLength; offset >= firstPossibleOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      const commentLength = buffer.readUInt16LE(offset + 20);
      if (offset + minimumLength + commentLength === buffer.length) {
        return offset;
      }
    }
  }

  throw new Error("The qUIck export is missing a valid ZIP directory.");
}

function mapArchiveEntry(rawName, archiveName) {
  const name = normalizeArchivePath(rawName, archiveName);
  let relativePath;

  if (name.startsWith("generated-ui/")) {
    relativePath = `exports/${name.slice("generated-ui/".length)}`;
  } else if (name.startsWith("assets/ui/")) {
    relativePath = `source/${name.slice("assets/ui/".length)}`;
  } else {
    throw new Error(
      `${archiveName} contains an unexpected file outside generated-ui/ or assets/ui/: ${name}`,
    );
  }

  if (!relativePath || !/\.(json|png)$/i.test(relativePath)) {
    throw new Error(`${archiveName} contains an unsupported qUIck export file: ${name}`);
  }

  return { archivePath: name, relativePath };
}

function normalizeArchivePath(rawName, archiveName) {
  if (!rawName || rawName.includes("\0") || rawName.includes("\\")) {
    throw new Error(`${archiveName} contains an invalid ZIP path.`);
  }
  if (rawName.startsWith("/") || /^[A-Za-z]:/.test(rawName)) {
    throw new Error(`${archiveName} contains an absolute ZIP path: ${rawName}`);
  }

  const normalized = path.posix.normalize(rawName);
  if (
    normalized !== rawName
    || normalized === ".."
    || normalized.startsWith("../")
    || normalized.split("/").includes("..")
  ) {
    throw new Error(`${archiveName} contains an unsafe ZIP path: ${rawName}`);
  }

  return normalized;
}

function validateArchiveDocuments({ archiveFiles, archiveName }) {
  const documents = [];

  for (const [relativePath, bytes] of archiveFiles) {
    if (!/^generated-ui\/[^/]+\.json$/i.test(relativePath)) {
      continue;
    }

    const archivePath = relativePath;

    let document;
    try {
      document = JSON.parse(bytes.toString("utf8"));
    } catch (error) {
      throw new Error(`${archiveName} contains invalid JSON at ${archivePath}: ${error.message}`);
    }

    if (
      !document
      || typeof document !== "object"
      || typeof document.name !== "string"
      || !Array.isArray(document.children)
      || !Array.isArray(document.assets)
    ) {
      throw new Error(`${archiveName} contains an invalid qUIck document at ${archivePath}.`);
    }

    for (const asset of document.assets) {
      if (!asset || typeof asset.src !== "string") {
        throw new Error(`${archivePath} contains a qUIck asset without a valid src.`);
      }
      const assetPath = normalizeAssetSource(asset.src, archivePath);
      if (!archiveFiles.has(assetPath)) {
        throw new Error(`${archivePath} references an asset missing from the ZIP: ${asset.src}`);
      }
    }

    documents.push({ archiveName, file: path.posix.basename(archivePath), name: document.name });
  }

  if (documents.length === 0) {
    throw new Error(`${archiveName} contains no generated-ui/*.json qUIck export.`);
  }

  return documents;
}

function normalizeAssetSource(src, documentPath) {
  let normalized = src.trim().replace(/^\/+/, "");
  if (normalized.startsWith("generated-ui/")) {
    normalized = normalized.slice("generated-ui/".length);
  }
  if (!normalized.startsWith("assets/ui/")) {
    throw new Error(
      `${documentPath} uses unsupported asset path "${src}". qUIck exports for this game must use assets/ui.`,
    );
  }
  return normalizeArchivePath(normalized, documentPath);
}

function resolveContainedPath(rootDir, relativePath) {
  const destination = path.resolve(rootDir, ...relativePath.split("/"));
  const relative = path.relative(rootDir, destination);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside ${rootDir}: ${relativePath}`);
  }
  return destination;
}

function assertAvailable(buffer, offset, length, archiveName) {
  if (offset < 0 || length < 0 || offset + length > buffer.length) {
    throw new Error(`${archiveName} is truncated or corrupt.`);
  }
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  importQuickUiExports()
    .then((result) => {
      const documentNames = result.documents.map((document) => document.name).join(", ");
      console.log(
        `Imported ${result.archives.length} qUIck ZIP(s): ${documentNames}. `
        + `Placed ${result.files} file(s), rebuilt the generated UI atlas, and deleted the ZIP(s).`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
