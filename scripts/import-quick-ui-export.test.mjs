import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { deflateRawSync } from "node:zlib";
import { importQuickUiExports } from "./import-quick-ui-export.mjs";

test("imports a qUIck ZIP, builds assets, and deletes the archive", async (context) => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "quick-import-success-"));
  context.after(() => import("node:fs/promises").then(({ rm }) => rm(projectRoot, { force: true, recursive: true })));
  const inboxDir = path.join(projectRoot, "qUIck-inbox");
  await mkdir(inboxDir, { recursive: true });

  const document = {
    name: "RewardDialog",
    children: [],
    assets: [{ id: "reward-bg", src: "assets/ui/RewardDialog/reward-bg.png" }],
  };
  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
    "base64",
  );
  const archivePath = path.join(inboxDir, "RewardDialog-ui-export.zip");
  await writeFile(archivePath, createZip([
    ["generated-ui/RewardDialog.json", Buffer.from(JSON.stringify(document))],
    ["assets/ui/RewardDialog/reward-bg.png", pngBytes],
    ["assets/ui/manifest.json", Buffer.from('{"version":1}')],
  ]));

  const result = await importQuickUiExports({ projectRoot });

  assert.equal(result.buildResult.atlasAssets, 1);
  assert.deepEqual(result.documents, [{
    archiveName: "RewardDialog-ui-export.zip",
    file: "RewardDialog.json",
    name: "RewardDialog",
  }]);
  assert.equal(
    JSON.parse(await readFile(
      path.join(projectRoot, "assets/quick-ui/exports/RewardDialog.json"),
      "utf8",
    )).name,
    "RewardDialog",
  );
  assert.deepEqual(
    await readFile(path.join(
      projectRoot,
      "assets/quick-ui/source/RewardDialog/reward-bg.png",
    )),
    pngBytes,
  );
  assert.equal(
    JSON.parse(await readFile(
      path.join(projectRoot, "assets/quick-ui/atlas/manifest.json"),
      "utf8",
    )).version,
    2,
  );
  await assert.rejects(readFile(archivePath), { code: "ENOENT" });
});

test("rejects unsafe paths and keeps the ZIP", async (context) => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "quick-import-unsafe-"));
  context.after(() => import("node:fs/promises").then(({ rm }) => rm(projectRoot, { force: true, recursive: true })));
  const inboxDir = path.join(projectRoot, "qUIck-inbox");
  await mkdir(inboxDir, { recursive: true });
  const archivePath = path.join(inboxDir, "unsafe-ui-export.zip");
  const archiveBytes = createZip([
    ["generated-ui/../escape.json", Buffer.from("{}")],
  ]);
  await writeFile(archivePath, archiveBytes);

  await assert.rejects(
    importQuickUiExports({ projectRoot, buildAssets: async () => ({}) }),
    /unsafe ZIP path/,
  );
  assert.deepEqual(await readFile(archivePath), archiveBytes);
});

test("keeps the ZIP when the asset build fails", async (context) => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "quick-import-build-fail-"));
  context.after(() => import("node:fs/promises").then(({ rm }) => rm(projectRoot, { force: true, recursive: true })));
  const inboxDir = path.join(projectRoot, "qUIck-inbox");
  await mkdir(inboxDir, { recursive: true });
  const archivePath = path.join(inboxDir, "EmptyDialog-ui-export.zip");
  const archiveBytes = createZip([
    ["generated-ui/EmptyDialog.json", Buffer.from(JSON.stringify({
      name: "EmptyDialog",
      children: [],
      assets: [],
    }))],
  ]);
  await writeFile(archivePath, archiveBytes);

  await assert.rejects(
    importQuickUiExports({
      projectRoot,
      buildAssets: async () => {
        throw new Error("atlas build failed");
      },
    }),
    /atlas build failed/,
  );
  assert.deepEqual(await readFile(archivePath), archiveBytes);
});

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const [name, bytesInput] of entries) {
    const nameBytes = Buffer.from(name, "utf8");
    const bytes = Buffer.from(bytesInput);
    const compressed = deflateRawSync(bytes);
    const crc = crc32(bytes);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(bytes.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localParts.push(localHeader, nameBytes, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(bytes.length, 24);
    centralHeader.writeUInt16LE(nameBytes.length, 28);
    centralHeader.writeUInt32LE(localOffset, 42);
    centralParts.push(centralHeader, nameBytes);

    localOffset += localHeader.length + nameBytes.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

const CRC_TABLE = makeCrcTable();

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
