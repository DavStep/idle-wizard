(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

  // ../src/exporter/assetNaming.ts
  var GENERIC_LAYER_NAMES = /* @__PURE__ */ new Set([
    "rectangle",
    "group",
    "frame",
    "vector",
    "instance",
    "layer",
    "image",
    "ellipse",
    "star",
    "polygon",
    "union",
    "booleanoperation",
    "boolean_operation"
  ]);
  var QUICK_TAG_REGEX = /@[a-zA-Z]+(?:\([^)]*\))?/g;
  function stripQuickTags(value) {
    return value.replace(QUICK_TAG_REGEX, " ").replace(/\s+/g, " ").trim();
  }
  function extractAssetNameOverride(value) {
    const match = value.match(/@asset\(([^)]*)\)/i);
    if (!match) {
      return void 0;
    }
    const sanitized = sanitizeAssetBaseName(match[1]);
    return sanitized || void 0;
  }
  function sanitizeAssetBaseName(value) {
    if (!value) {
      return "";
    }
    return value.normalize("NFKD").toLowerCase().replace(QUICK_TAG_REGEX, " ").replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/[^a-z0-9_.-]+/g, "_").replace(/_+/g, "_").replace(/^[_.-]+|[_.-]+$/g, "");
  }
  function isGenericAssetBaseName(value) {
    const sanitized = sanitizeAssetBaseName(value);
    if (!sanitized) {
      return true;
    }
    if (/^asset[-_]?[a-f0-9]{6,}(?:[-_]\d+)?$/i.test(sanitized) || /^ui[-_]?asset$/i.test(sanitized)) {
      return true;
    }
    const compact = sanitized.replace(/[_.-]+/g, "");
    if (!compact) {
      return true;
    }
    const withoutTrailingDigits = compact.replace(/\d+$/g, "");
    return GENERIC_LAYER_NAMES.has(compact) || GENERIC_LAYER_NAMES.has(withoutTrailingDigits);
  }
  function shortHash(value, length = 6) {
    return sanitizeAssetBaseName(value).replace(/[^a-z0-9]/g, "").slice(0, length) || "000000";
  }
  function fallbackAssetBaseName(hashOrId) {
    return `asset_${shortHash(hashOrId, 8)}`;
  }
  function scoreAssetNameCandidate(candidate) {
    var _a;
    const generic = isGenericAssetBaseName(candidate.name);
    const sourceScore = candidate.source === "explicit" ? 1e4 : candidate.source === "component" ? 8e3 : candidate.source === "context" ? 6e3 : candidate.source === "layer" ? 5e3 : 1e3;
    const qualityScore = generic ? 0 : 1e3;
    const lengthScore = Math.max(0, 240 - candidate.name.length);
    const orderPenalty = Math.max(0, (_a = candidate.order) != null ? _a : 0);
    return sourceScore + qualityScore + lengthScore - orderPenalty;
  }
  function resolveAssetNameCandidate(candidate) {
    return __spreadProps(__spreadValues({}, candidate), {
      generic: isGenericAssetBaseName(candidate.name),
      score: scoreAssetNameCandidate(candidate)
    });
  }
  function chooseBestAssetName(candidates, fallbackHash) {
    const resolved = candidates.map((candidate) => __spreadProps(__spreadValues({}, candidate), {
      name: sanitizeAssetBaseName(candidate.name)
    })).filter((candidate) => candidate.name.length > 0).map(resolveAssetNameCandidate);
    if (resolved.length === 0) {
      return resolveAssetNameCandidate({
        name: fallbackAssetBaseName(fallbackHash),
        source: "fallback",
        order: Number.MAX_SAFE_INTEGER
      });
    }
    resolved.sort((a, b) => {
      var _a, _b;
      if (b.score !== a.score) return b.score - a.score;
      if (a.name.length !== b.name.length) return a.name.length - b.name.length;
      return ((_a = a.order) != null ? _a : 0) - ((_b = b.order) != null ? _b : 0);
    });
    const best = resolved[0];
    if (!best.generic || best.source === "explicit") {
      return best;
    }
    return resolveAssetNameCandidate({
      name: `${best.name}_${shortHash(fallbackHash, 6)}`,
      source: best.source,
      originalName: best.originalName,
      order: best.order
    });
  }
  function buildAssetBaseName(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const candidates = [];
    const explicitName = sanitizeAssetBaseName((_b = options.assetName) != null ? _b : extractAssetNameOverride((_a = options.rawName) != null ? _a : ""));
    const cleanLayerName2 = sanitizeAssetBaseName((_d = options.cleanName) != null ? _d : stripQuickTags((_c = options.rawName) != null ? _c : ""));
    const componentName = sanitizeAssetBaseName(stripQuickTags((_e = options.componentName) != null ? _e : ""));
    const parentName = sanitizeAssetBaseName(stripQuickTags((_f = options.parentName) != null ? _f : ""));
    const rootName = sanitizeAssetBaseName(stripQuickTags((_g = options.rootName) != null ? _g : ""));
    if (explicitName) {
      candidates.push({ name: explicitName, source: "explicit", originalName: options.assetName, order: 0 });
    }
    if (componentName && !isGenericAssetBaseName(componentName)) {
      candidates.push({ name: componentName, source: "component", originalName: options.componentName, order: 1 });
    }
    if (cleanLayerName2) {
      candidates.push({ name: cleanLayerName2, source: "layer", originalName: options.cleanName, order: 2 });
    }
    const needsContext = !cleanLayerName2 || isGenericAssetBaseName(cleanLayerName2);
    if (needsContext) {
      const contextPrefix = !isGenericAssetBaseName(parentName) ? parentName : !isGenericAssetBaseName(rootName) ? rootName : "";
      if (contextPrefix && cleanLayerName2) {
        candidates.push({
          name: `${contextPrefix}_${cleanLayerName2}`,
          source: "context",
          originalName: `${(_i = (_h = options.parentName) != null ? _h : options.rootName) != null ? _i : ""} ${(_j = options.cleanName) != null ? _j : ""}`.trim(),
          order: 3
        });
      }
    }
    return chooseBestAssetName(candidates, options.fallbackHash);
  }
  function assetBaseNameFromPath(path) {
    var _a;
    if (!path) {
      return "";
    }
    const clean = (_a = path.split(/[?#]/, 1)[0]) != null ? _a : "";
    const slashIndex = Math.max(clean.lastIndexOf("/"), clean.lastIndexOf("\\"));
    const fileName = slashIndex >= 0 ? clean.slice(slashIndex + 1) : clean;
    const dotIndex = fileName.lastIndexOf(".");
    return sanitizeAssetBaseName(dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName);
  }

  // ../src/exporter/nineSlice.ts
  var NINE_SLICE_PLUGIN_KEY = "nineSlice";
  var AUTO_NINE_SLICE_ALGORITHM_VERSION = "first-safe-zone-v5";
  var NINE_SLICE_AUTO_MODES = /* @__PURE__ */ new Set([
    "nineSlice",
    "horizontalThreeSlice",
    "verticalThreeSliceCandidate",
    "fallback"
  ]);
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function readInsetValue(value) {
    return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : void 0;
  }
  function parseNineSliceInsets(value) {
    if (!value || typeof value !== "object") {
      return void 0;
    }
    const candidate = value;
    const left = readInsetValue(candidate.left);
    const top = readInsetValue(candidate.top);
    const right = readInsetValue(candidate.right);
    const bottom = readInsetValue(candidate.bottom);
    if (typeof left !== "number" || typeof top !== "number" || typeof right !== "number" || typeof bottom !== "number") {
      return void 0;
    }
    return { left, top, right, bottom };
  }
  function createSafeDefaultNineSlice(width, height) {
    const widthBase = clamp(Math.round(width * 0.08), 24, 96);
    const heightBase = clamp(Math.round(height * 0.08), 24, 96);
    const sideMax = width < 200 ? width * 0.25 : 96;
    const verticalMax = height < 100 ? height * 0.25 : 96;
    let left = Math.floor(clamp(widthBase, 0, sideMax));
    let right = Math.floor(clamp(widthBase, 0, sideMax));
    let top = Math.floor(clamp(heightBase, 0, verticalMax));
    let bottom = Math.floor(clamp(heightBase, 0, verticalMax));
    const maxHorizontal = Math.max(0, Math.floor(width - 1));
    const maxVertical = Math.max(0, Math.floor(height - 1));
    if (left + right > maxHorizontal) {
      const half = Math.floor(maxHorizontal / 2);
      left = half;
      right = maxHorizontal - half;
    }
    if (top + bottom > maxVertical) {
      const half = Math.floor(maxVertical / 2);
      top = half;
      bottom = maxVertical - half;
    }
    return { left, top, right, bottom };
  }
  function validateNineSliceInsets(insets, width, height) {
    const values = [insets.left, insets.top, insets.right, insets.bottom];
    if (!values.every((value) => Number.isFinite(value))) {
      return "Slice values must be valid numbers.";
    }
    if (values.some((value) => value < 0)) {
      return "Slice values must be >= 0.";
    }
    if (typeof width === "number" && insets.left + insets.right >= width) {
      return "left + right must be less than node width.";
    }
    if (typeof height === "number" && insets.top + insets.bottom >= height) {
      return "top + bottom must be less than node height.";
    }
    return null;
  }
  function sanitizeNineSliceInsets(insets, width, height) {
    let left = Math.max(0, Math.round(insets.left));
    let top = Math.max(0, Math.round(insets.top));
    let right = Math.max(0, Math.round(insets.right));
    let bottom = Math.max(0, Math.round(insets.bottom));
    const maxHorizontal = Math.max(0, Math.floor(width - 1));
    const maxVertical = Math.max(0, Math.floor(height - 1));
    if (left + right > maxHorizontal) {
      const scale = maxHorizontal / Math.max(1, left + right);
      left = Math.floor(left * scale);
      right = Math.floor(right * scale);
      if (left + right > maxHorizontal) {
        right = Math.max(0, maxHorizontal - left);
      }
    }
    if (top + bottom > maxVertical) {
      const scale = maxVertical / Math.max(1, top + bottom);
      top = Math.floor(top * scale);
      bottom = Math.floor(bottom * scale);
      if (top + bottom > maxVertical) {
        bottom = Math.max(0, maxVertical - top);
      }
    }
    return { left, top, right, bottom };
  }
  function parseNineSliceMetadata(raw, width, height) {
    var _a;
    if (!raw || typeof raw !== "object") {
      return void 0;
    }
    const candidate = raw;
    const source = candidate.source === "manual" || candidate.source === "auto" || candidate.source === "default" ? candidate.source : void 0;
    const insets = (_a = parseNineSliceInsets(candidate.insets)) != null ? _a : parseNineSliceInsets(candidate);
    if (!insets) {
      return void 0;
    }
    const sanitized = typeof width === "number" && typeof height === "number" ? sanitizeNineSliceInsets(insets, width, height) : insets;
    if (validateNineSliceInsets(sanitized, width, height)) {
      return void 0;
    }
    if (!source) {
      return {
        source: "manual",
        approved: true,
        insets: sanitized
      };
    }
    const mode = typeof candidate.mode === "string" && NINE_SLICE_AUTO_MODES.has(candidate.mode) ? candidate.mode : void 0;
    const warnings = Array.isArray(candidate.warnings) ? candidate.warnings.filter((warning) => typeof warning === "string" && warning.trim().length > 0) : void 0;
    const debug = candidate.debug && typeof candidate.debug === "object" && !Array.isArray(candidate.debug) ? candidate.debug : void 0;
    return {
      source,
      approved: source === "manual" ? true : Boolean(candidate.approved),
      confidence: typeof candidate.confidence === "number" ? candidate.confidence : void 0,
      insets: sanitized,
      assetHash: typeof candidate.assetHash === "string" && candidate.assetHash.trim() ? candidate.assetHash : void 0,
      algorithmVersion: typeof candidate.algorithmVersion === "string" && candidate.algorithmVersion.trim() ? candidate.algorithmVersion : void 0,
      mode,
      warnings: (warnings == null ? void 0 : warnings.length) ? warnings : void 0,
      debug,
      generatedAt: typeof candidate.generatedAt === "number" ? candidate.generatedAt : void 0
    };
  }
  function parseNineSliceMetadataString(raw, width, height) {
    if (!raw) {
      return void 0;
    }
    try {
      return parseNineSliceMetadata(JSON.parse(raw), width, height);
    } catch (e) {
      return void 0;
    }
  }
  function serializeNineSliceMetadata(metadata) {
    return JSON.stringify(metadata);
  }
  function readNineSliceMetadataFromLayerName(name, width, height) {
    const match = name.match(/@nine\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)/i);
    if (!match) {
      return void 0;
    }
    const parsed = parseNineSliceInsets({
      left: Number(match[1]),
      top: Number(match[2]),
      right: Number(match[3]),
      bottom: Number(match[4])
    });
    if (!parsed) {
      return void 0;
    }
    const sanitized = typeof width === "number" && typeof height === "number" ? sanitizeNineSliceInsets(parsed, width, height) : parsed;
    if (validateNineSliceInsets(sanitized, width, height)) {
      return void 0;
    }
    return {
      source: "manual",
      approved: true,
      insets: sanitized
    };
  }
  function resolveNineSliceMetadata(stored, layerNameFallback, width, height) {
    if ((stored == null ? void 0 : stored.source) === "manual") {
      return stored;
    }
    if (layerNameFallback) {
      return layerNameFallback;
    }
    if ((stored == null ? void 0 : stored.source) === "auto" && stored.algorithmVersion === AUTO_NINE_SLICE_ALGORITHM_VERSION) {
      return stored;
    }
    if ((stored == null ? void 0 : stored.source) === "default") {
      return stored;
    }
    return {
      source: "default",
      approved: false,
      insets: createSafeDefaultNineSlice(width, height),
      algorithmVersion: AUTO_NINE_SLICE_ALGORITHM_VERSION,
      mode: "fallback",
      generatedAt: Date.now()
    };
  }
  function hashBytes(bytes) {
    let hash = 2166136261;
    for (const byte of bytes) {
      hash ^= byte;
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  // ../src/exporter/assetFinalizer.ts
  function normalizePathSegment(value, fallback) {
    const cleaned = String(value || fallback).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/\s+/g, " ").trim();
    return cleaned || fallback;
  }
  function joinPath(...parts) {
    return parts.map((part) => part.replace(/^\/+|\/+$/g, "")).filter((part) => part.length > 0).join("/");
  }
  function inferAssetBasePath(documents, fallback = "assets/ui") {
    var _a;
    for (const entry of documents) {
      for (const asset of entry.document.assets) {
        if (!asset.src) {
          continue;
        }
        const clean = (_a = asset.src.split(/[?#]/, 1)[0]) != null ? _a : "";
        const parts = clean.split("/").filter(Boolean);
        if (parts.length >= 3) {
          return parts.slice(0, -2).join("/") || fallback;
        }
      }
    }
    return fallback;
  }
  function buildRootFolders(documents) {
    const seen = /* @__PURE__ */ new Map();
    return documents.map((entry, index) => {
      var _a;
      const base = normalizePathSegment(entry.document.name, `Export${index + 1}`);
      const count = (_a = seen.get(base)) != null ? _a : 0;
      seen.set(base, count + 1);
      return count === 0 ? base : `${base}__${count + 1}`;
    });
  }
  function ensureValidation(doc) {
    if (!doc.meta) {
      doc.meta = {
        source: "figma",
        exportedRootId: "",
        validation: { warnings: [], errors: [] }
      };
    }
    if (!doc.meta.validation) {
      doc.meta.validation = { warnings: [], errors: [] };
    }
    if (!Array.isArray(doc.meta.validation.warnings)) {
      doc.meta.validation.warnings = [];
    }
    if (!Array.isArray(doc.meta.validation.errors)) {
      doc.meta.validation.errors = [];
    }
    return doc.meta.validation;
  }
  function appendWarning(doc, message) {
    const validation = ensureValidation(doc);
    if (!validation.warnings.includes(message)) {
      validation.warnings.push(message);
    }
  }
  function collectAssetRefs(documents, rootFolders) {
    const refs = [];
    let order = 0;
    documents.forEach((entry, documentIndex) => {
      const manifestAssetById = new Map(entry.document.assets.map((asset) => [asset.id, asset]));
      for (const payload of entry.assets) {
        const manifestAsset = manifestAssetById.get(payload.assetId);
        if (!manifestAsset) {
          continue;
        }
        refs.push({
          documentIndex,
          rootName: entry.document.name,
          rootFolder: rootFolders[documentIndex],
          previousAssetId: payload.assetId,
          asset: manifestAsset,
          payload,
          bytes: payload.bytes,
          order: order++
        });
      }
    });
    return refs;
  }
  function sourceFromExplicitFlag(source, explicitName) {
    if (explicitName) {
      return "explicit";
    }
    return source != null ? source : "layer";
  }
  function pushCandidate(candidates, name, source, order) {
    const sanitized = sanitizeAssetBaseName(name);
    if (!sanitized) {
      return;
    }
    candidates.push({ name: sanitized, source, order });
  }
  function collectNameCandidates(ref) {
    const candidates = [];
    pushCandidate(
      candidates,
      ref.asset.name,
      sourceFromExplicitFlag(ref.asset.nameSource, ref.asset.nameSource === "explicit"),
      ref.order * 10
    );
    pushCandidate(
      candidates,
      ref.payload.name,
      sourceFromExplicitFlag(ref.payload.nameSource, ref.payload.explicitName),
      ref.order * 10 + 1
    );
    pushCandidate(candidates, assetBaseNameFromPath(ref.payload.fileName), "layer", ref.order * 10 + 2);
    pushCandidate(candidates, assetBaseNameFromPath(ref.asset.src), "layer", ref.order * 10 + 3);
    return candidates;
  }
  function makeCanonicalAsset(ref, hash) {
    const id = `asset-${hash}-${ref.bytes.length}`;
    return {
      signature: `png:${hash}:${ref.bytes.length}`,
      hash,
      id,
      bytes: ref.bytes,
      refs: [],
      candidates: [],
      baseName: fallbackAssetBaseName(hash),
      fileName: `${fallbackAssetBaseName(hash)}.png`,
      src: "",
      shared: false,
      usedBy: [],
      manifestAsset: __spreadProps(__spreadValues({}, ref.asset), {
        id,
        name: fallbackAssetBaseName(hash),
        src: "",
        shared: false,
        usedBy: [ref.rootName]
      })
    };
  }
  function collectCanonicalAssets(refs) {
    const canonicalBySignature = /* @__PURE__ */ new Map();
    for (const ref of refs) {
      const hash = hashBytes(ref.bytes);
      const signature = `png:${hash}:${ref.bytes.length}`;
      let canonical = canonicalBySignature.get(signature);
      if (!canonical) {
        canonical = makeCanonicalAsset(ref, hash);
        canonicalBySignature.set(signature, canonical);
      }
      canonical.refs.push(ref);
      canonical.candidates.push(...collectNameCandidates(ref));
    }
    return Array.from(canonicalBySignature.values()).sort((a, b) => a.refs[0].order - b.refs[0].order);
  }
  function uniqueSorted(values) {
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }
  function canonicalUsedBy(canonical) {
    return uniqueSorted(canonical.refs.map((ref) => ref.rootName));
  }
  function appendWarningsForCanonicalAliases(documents, canonical) {
    const candidateNames = uniqueSorted(
      canonical.candidates.map((candidate) => sanitizeAssetBaseName(candidate.name)).filter((name) => name && name !== canonical.baseName && !isGenericAssetBaseName(name))
    );
    if (candidateNames.length === 0) {
      return;
    }
    const message = `Identical PNG bytes were referenced by multiple names: "${candidateNames.join(
      '", "'
    )}"; using "${canonical.fileName}"`;
    for (const documentIndex of new Set(canonical.refs.map((ref) => ref.documentIndex))) {
      appendWarning(documents[documentIndex].document, message);
    }
    canonical.manifestAsset.aliases = candidateNames;
  }
  function chooseCanonicalNames(canonicalAssets) {
    for (const canonical of canonicalAssets) {
      const chosen = chooseBestAssetName(canonical.candidates, canonical.hash);
      canonical.baseName = chosen.name || fallbackAssetBaseName(canonical.hash);
    }
  }
  function assignCanonicalPaths(documents, canonicalAssets, assetBasePath, sharedMode) {
    var _a, _b;
    const byBaseName = /* @__PURE__ */ new Map();
    for (const canonical of canonicalAssets) {
      const group = (_a = byBaseName.get(canonical.baseName)) != null ? _a : [];
      group.push(canonical);
      byBaseName.set(canonical.baseName, group);
    }
    const usedPaths = /* @__PURE__ */ new Set();
    for (const group of byBaseName.values()) {
      group.sort((a, b) => {
        const aBest = chooseBestAssetName(a.candidates, a.hash);
        const bBest = chooseBestAssetName(b.candidates, b.hash);
        if (bBest.score !== aBest.score) return bBest.score - aBest.score;
        return a.hash.localeCompare(b.hash);
      });
      if (group.length > 1) {
        const fileNames = group.map(
          (canonical, index) => index === 0 ? `${canonical.baseName}.png` : `${canonical.baseName}__${shortHash(canonical.hash, 6)}.png`
        );
        const message = `Duplicate asset name "${group[0].baseName}" produced multiple different PNGs: ${fileNames.join(", ")}`;
        for (const canonical of group) {
          for (const documentIndex of new Set(canonical.refs.map((ref) => ref.documentIndex))) {
            appendWarning(documents[documentIndex].document, message);
          }
        }
      }
      for (const [index, canonical] of group.entries()) {
        const usedByRootFolders = uniqueSorted(canonical.refs.map((ref) => ref.rootFolder));
        canonical.usedBy = canonicalUsedBy(canonical);
        canonical.shared = sharedMode === "all-shared" ? true : sharedMode === "none" ? false : usedByRootFolders.length > 1;
        const folder = canonical.shared ? "shared" : usedByRootFolders[0];
        const suffix = index === 0 ? "" : `__${shortHash(canonical.hash, 6)}`;
        let fileName = `${canonical.baseName}${suffix}.png`;
        let src = joinPath(assetBasePath, folder, fileName);
        let conflictIndex = 2;
        while (usedPaths.has(src)) {
          fileName = `${canonical.baseName}${suffix}__${conflictIndex}.png`;
          src = joinPath(assetBasePath, folder, fileName);
          conflictIndex += 1;
        }
        usedPaths.add(src);
        canonical.fileName = fileName;
        canonical.src = src;
        canonical.manifestAsset = __spreadProps(__spreadValues({}, canonical.refs[0].asset), {
          id: canonical.id,
          name: canonical.baseName,
          src,
          width: canonical.refs[0].asset.width,
          height: canonical.refs[0].asset.height,
          scale: canonical.refs[0].asset.scale,
          mimeType: (_b = canonical.refs[0].asset.mimeType) != null ? _b : "image/png",
          shared: canonical.shared,
          usedBy: canonical.usedBy
        });
        appendWarningsForCanonicalAliases(documents, canonical);
      }
    }
  }
  function remapDocumentNodeAssets(nodes, nextAssetByPreviousId) {
    var _a;
    for (const node of nodes) {
      if ("assetId" in node) {
        const nextAsset = nextAssetByPreviousId.get(node.assetId);
        if (nextAsset) {
          node.assetId = nextAsset.id;
          if ("asset" in node) {
            node.asset = nextAsset.src;
          }
        }
      }
      if ((_a = node.children) == null ? void 0 : _a.length) {
        remapDocumentNodeAssets(node.children, nextAssetByPreviousId);
      }
    }
  }
  function rewriteDocuments(documents, canonicalAssets) {
    documents.forEach((entry, documentIndex) => {
      const canonicalForDocument = canonicalAssets.filter(
        (canonical) => canonical.refs.some((ref) => ref.documentIndex === documentIndex)
      );
      const nextAssetByPreviousId = /* @__PURE__ */ new Map();
      for (const canonical of canonicalForDocument) {
        for (const ref of canonical.refs) {
          if (ref.documentIndex === documentIndex) {
            nextAssetByPreviousId.set(ref.previousAssetId, canonical.manifestAsset);
          }
        }
      }
      entry.document.assets = canonicalForDocument.map((canonical) => canonical.manifestAsset);
      remapDocumentNodeAssets(entry.document.children, nextAssetByPreviousId);
      const sharedAssets = canonicalForDocument.filter((canonical) => canonical.shared).length;
      const localAssets = canonicalForDocument.length - sharedAssets;
      ensureValidation(entry.document);
      entry.document.meta.assetStats = {
        totalReferencedAssets: entry.assets.length,
        uniqueAssets: canonicalForDocument.length,
        sharedAssets,
        localAssets
      };
    });
  }
  function finalizeExportedAssetsForDocuments(options) {
    var _a, _b;
    const assetBasePath = (_a = options.assetBasePath) != null ? _a : inferAssetBasePath(options.documents);
    const sharedMode = (_b = options.sharedMode) != null ? _b : "reused-only";
    const rootFolders = buildRootFolders(options.documents);
    const refs = collectAssetRefs(options.documents, rootFolders);
    const canonicalAssets = collectCanonicalAssets(refs);
    chooseCanonicalNames(canonicalAssets);
    assignCanonicalPaths(options.documents, canonicalAssets, assetBasePath, sharedMode);
    rewriteDocuments(options.documents, canonicalAssets);
    return {
      assets: canonicalAssets.map((canonical) => ({
        assetId: canonical.id,
        fileName: canonical.fileName,
        src: canonical.src,
        bytes: canonical.bytes,
        name: canonical.baseName,
        nameSource: canonical.refs[0].payload.nameSource,
        explicitName: canonical.refs[0].payload.explicitName
      })),
      manifest: {
        version: 1,
        assetBasePath,
        assets: canonicalAssets.map((canonical) => canonical.manifestAsset)
      }
    };
  }

  // ../src/exporter/tagParser.ts
  var KNOWN_ALIGNS = /* @__PURE__ */ new Set([
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    "top-center",
    "top-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
    "left-center",
    "right-center",
    "stretch-width",
    "stretch-height",
    "stretch-full"
  ]);
  function parseLayerTags(name) {
    const source = name.trim();
    const tags = { cleanName: source };
    const ranges = [];
    const tokenRegex = /@([a-zA-Z]+)(?:\(([^)]*)\))?/g;
    let match;
    while ((match = tokenRegex.exec(source)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
      const tagName = match[1].toLowerCase();
      const args = match[2] ? match[2].trim() : "";
      switch (tagName) {
        case "screen":
          tags.kind = "screen";
          break;
        case "dialog":
          tags.dialog = true;
          tags.kind = "dialog";
          break;
        case "hud":
        case "component":
          tags.kind = tagName;
          break;
        case "modal":
          tags.modal = true;
          break;
        case "container":
          tags.container = true;
          break;
        case "button":
          tags.button = true;
          break;
        case "raster":
          tags.raster = true;
          break;
        case "image":
          tags.image = true;
          break;
        case "text":
          tags.text = true;
          break;
        case "overlay":
          tags.overlay = true;
          break;
        case "nine":
          tags.nine = true;
          break;
        case "ignore":
          tags.ignore = true;
          break;
        case "asset":
          if (args.length > 0) {
            tags.assetName = args;
          }
          break;
        case "align": {
          if (KNOWN_ALIGNS.has(args)) {
            tags.align = args;
          } else if (args.length > 0) {
            tags.unsupportedAlign = args;
          }
          break;
        }
        default:
          break;
      }
    }
    tags.cleanName = stripRanges(source, ranges);
    return tags;
  }
  function stripRanges(source, ranges) {
    if (ranges.length === 0) {
      return source;
    }
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const chunks = [];
    let cursor = 0;
    for (const range of sorted) {
      if (cursor < range.start) {
        chunks.push(source.slice(cursor, range.start));
      }
      cursor = Math.max(cursor, range.end);
    }
    if (cursor < source.length) {
      chunks.push(source.slice(cursor));
    }
    return chunks.join(" ").replace(/\s+/g, " ").trim();
  }

  // ../src/schema.ts
  var FIGMA_PIXI_UI_SCHEMA_VERSION = "1.0.0";

  // ../src/exporter/figmaExporter.ts
  var DEFAULT_ASSET_BASE_PATH = "assets/ui";
  var DEFAULT_ASSET_SCALE = 1;
  var CONTENT_LAYER_NAME = "@content";
  function normalizeRootName(name) {
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim() || "ExportedUI";
  }
  function stableId(value) {
    return value.replace(/[^a-zA-Z0-9_-]/g, "_");
  }
  function buildInstanceKey(cleanName, nodeId, fallbackPath) {
    const baseName = stableId(cleanName.trim() || "node");
    const suffix = (nodeId == null ? void 0 : nodeId.trim()) ? stableId(nodeId) : fallbackPath;
    return `${baseName}__${suffix || "node"}`;
  }
  function round(value) {
    return Math.round(value * 1e3) / 1e3;
  }
  function readBounds(node) {
    const bounds = node.absoluteBoundingBox;
    if (!bounds) {
      throw new Error(`Node "${"name" in node ? node.name : "unknown"}" has no absolute bounds.`);
    }
    return bounds;
  }
  function readNineSliceRenderBounds(node) {
    const bounds = node.absoluteRenderBounds;
    if (!bounds || !Number.isFinite(bounds.x) || !Number.isFinite(bounds.y) || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height) || bounds.width <= 0 || bounds.height <= 0) {
      throw new Error(`@nine node "${node.name}" has no visible rendered pixels.`);
    }
    return bounds;
  }
  function readRotation(node) {
    return "rotation" in node && typeof node.rotation === "number" ? round(node.rotation) : 0;
  }
  function readAbsolutePosition(node) {
    return {
      x: node.absoluteTransform[0][2],
      y: node.absoluteTransform[1][2]
    };
  }
  function readRelativePosition(node, parent) {
    const nodeAbs = readAbsolutePosition(node);
    const parentAbs = readAbsolutePosition(parent);
    return {
      x: round(nodeAbs.x - parentAbs.x),
      y: round(nodeAbs.y - parentAbs.y)
    };
  }
  function readRelativeScale(node) {
    const transform = "relativeTransform" in node ? node.relativeTransform : void 0;
    if (!transform) {
      return { scaleX: 1, scaleY: 1 };
    }
    return {
      scaleX: Math.hypot(transform[0][0], transform[1][0]),
      scaleY: Math.hypot(transform[0][1], transform[1][1])
    };
  }
  function isApproximately(value, expected, epsilon = 1e-3) {
    return Math.abs(value - expected) <= epsilon;
  }
  function hexFromSolidFill(node) {
    if (!("fills" in node)) {
      return {};
    }
    const fills = node.fills;
    if (fills === figma.mixed || !Array.isArray(fills)) {
      return {};
    }
    const solid = fills.find((fill) => fill.visible !== false && fill.type === "SOLID");
    if (!solid || solid.type !== "SOLID") {
      return {};
    }
    const toHex = (v) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, "0");
    return {
      color: `#${toHex(solid.color.r)}${toHex(solid.color.g)}${toHex(solid.color.b)}`,
      alpha: typeof solid.opacity === "number" ? solid.opacity : 1
    };
  }
  function readNineSliceMetadataFromPluginData(node, width, height) {
    const raw = node.getPluginData(NINE_SLICE_PLUGIN_KEY);
    if (!raw) {
      return void 0;
    }
    return parseNineSliceMetadataString(raw, width, height);
  }
  function mapHorizontalAlign(value) {
    switch (value) {
      case "LEFT":
        return "left";
      case "CENTER":
        return "center";
      case "RIGHT":
        return "right";
      case "JUSTIFIED":
        return "justify";
      default:
        throw new Error(`Unsupported Figma text horizontal align: ${String(value)}.`);
    }
  }
  function mapVerticalAlign(value) {
    switch (value) {
      case "TOP":
        return "top";
      case "CENTER":
        return "center";
      case "BOTTOM":
        return "bottom";
      default:
        throw new Error(`Unsupported Figma text vertical align: ${String(value)}.`);
    }
  }
  function mapTextAutoResize(value) {
    switch (value) {
      case "NONE":
        return "none";
      case "HEIGHT":
        return "height";
      case "WIDTH_AND_HEIGHT":
        return "widthAndHeight";
      case "TRUNCATE":
        return "truncate";
      default:
        throw new Error(`Unsupported Figma text auto-resize mode: ${String(value)}.`);
    }
  }
  function textStyleHasFixedWidth(style) {
    return style.autoResize === "none" || style.autoResize === "height" || style.autoResize === "truncate";
  }
  function readStrokeStyle(node) {
    if (!Array.isArray(node.strokes)) {
      return {};
    }
    const solid = node.strokes.find((stroke) => stroke.visible !== false && stroke.type === "SOLID");
    if (!solid || solid.type !== "SOLID") {
      return {};
    }
    const toHex = (v) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, "0");
    return {
      stroke: `#${toHex(solid.color.r)}${toHex(solid.color.g)}${toHex(solid.color.b)}`,
      strokeWidth: typeof node.strokeWeight === "number" ? round(node.strokeWeight) : 1
    };
  }
  function readTextStyle(node) {
    const fill = hexFromSolidFill(node);
    const stroke = readStrokeStyle(node);
    const fontName = node.fontName !== figma.mixed ? node.fontName : void 0;
    const fontSize = node.fontSize !== figma.mixed ? node.fontSize : 16;
    const lineHeight = node.lineHeight !== figma.mixed && node.lineHeight.unit === "PIXELS" ? node.lineHeight.value : void 0;
    const letterSpacing = node.letterSpacing !== figma.mixed && node.letterSpacing.unit === "PIXELS" ? node.letterSpacing.value : void 0;
    const autoResize = mapTextAutoResize(node.textAutoResize);
    return {
      fontFamily: fontName && "family" in fontName ? fontName.family : void 0,
      fontSize: round(Number(fontSize)),
      fontWeight: fontName && "style" in fontName ? fontName.style : void 0,
      lineHeight: lineHeight ? round(lineHeight) : void 0,
      letterSpacing: letterSpacing ? round(letterSpacing) : void 0,
      color: fill.color,
      fill: fill.color,
      stroke: stroke.stroke,
      strokeWidth: stroke.strokeWidth,
      alpha: fill.alpha,
      align: mapHorizontalAlign(node.textAlignHorizontal),
      verticalAlign: mapVerticalAlign(node.textAlignVertical),
      autoResize,
      wrap: autoResize === "none" || autoResize === "height" || autoResize === "truncate"
    };
  }
  function hasImageFill(paints) {
    return paints !== figma.mixed && paints.some((paint) => paint.visible !== false && paint.type === "IMAGE");
  }
  function hasNonSolidPaint(paints) {
    return paints !== figma.mixed && paints.some((paint) => paint.visible !== false && paint.type !== "SOLID");
  }
  function hasEffects(node) {
    return "effects" in node && node.effects.some((effect) => effect.visible !== false);
  }
  function requiresRasterAsset(node) {
    if ("fills" in node && hasImageFill(node.fills)) return true;
    if ("fills" in node && hasNonSolidPaint(node.fills)) return true;
    if ("strokes" in node && hasNonSolidPaint(node.strokes)) return true;
    return hasEffects(node);
  }
  function hasRenderableChildren(node) {
    return "children" in node && Array.isArray(node.children) && node.children.length > 0;
  }
  function collectVisibleTextDescendants(node, result = []) {
    if ("visible" in node && !node.visible) {
      return result;
    }
    const tags = parseLayerTags(node.name);
    if (tags.ignore) {
      return result;
    }
    if (node.type === "TEXT") {
      result.push(node);
      return result;
    }
    if (hasRenderableChildren(node)) {
      for (const child of getChildrenInPaintOrder(node)) {
        collectVisibleTextDescendants(child, result);
      }
    }
    return result;
  }
  function isContentMetadataNode(node) {
    return node.name === CONTENT_LAYER_NAME;
  }
  function getChildrenInPaintOrder(node) {
    const children = [...node.children];
    if ("itemReverseZIndex" in node && node.itemReverseZIndex) {
      children.reverse();
    }
    return children;
  }
  function readComponentName(node) {
    if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
      return node.name;
    }
    const mainComponent = node.mainComponent;
    return typeof (mainComponent == null ? void 0 : mainComponent.name) === "string" && mainComponent.name.trim() ? mainComponent.name : void 0;
  }
  function readContextName(node) {
    return parseLayerTags(node.name).cleanName || node.name;
  }
  function registerAsset(node, cleanName, bounds, context, tags) {
    const assetId = `asset-${stableId(node.id)}`;
    const assetName = buildAssetBaseName({
      rawName: node.name,
      cleanName,
      assetName: tags.assetName,
      componentName: readComponentName(node),
      parentName: context.parentNode && context.parentNode !== node ? readContextName(context.parentNode) : void 0,
      rootName: context.rootName,
      fallbackHash: stableId(node.id)
    });
    const fileName = `${assetName.name}.png`;
    const src = `${context.assetBasePath}/${normalizeRootName(context.rootName)}/${fileName}`;
    if (!context.assets.has(assetId)) {
      context.assets.set(assetId, {
        id: assetId,
        name: assetName.name,
        src,
        width: round(bounds.width * context.assetScale),
        height: round(bounds.height * context.assetScale),
        scale: context.assetScale,
        mimeType: "image/png",
        nameSource: assetName.source
      });
      context.assetRequests.push({
        assetId,
        nodeId: node.id,
        fileName,
        name: assetName.name,
        nameSource: assetName.source,
        explicitName: assetName.source === "explicit",
        scale: context.assetScale
      });
    }
    return context.assets.get(assetId);
  }
  function readAlign(tagAlign) {
    return tagAlign;
  }
  function validateName(cleanName, rawName, context) {
    if (cleanName.length === 0) {
      context.warnings.push(`Unnamed layer found ("${rawName}")`);
      return;
    }
    if (cleanName.includes("@")) {
      context.errors.push(`Raw tags leaked into exported name "${cleanName}"`);
    }
  }
  function readRootContentMetadata(root, warnings) {
    if (!hasRenderableChildren(root)) {
      return void 0;
    }
    const contentLayers = getChildrenInPaintOrder(root).filter((child) => isContentMetadataNode(child));
    if (contentLayers.length === 0) {
      return void 0;
    }
    if (contentLayers.length > 1) {
      warnings.push(`Multiple ${CONTENT_LAYER_NAME} layers found in "${root.name}". Using the first one.`);
    }
    const contentLayer = contentLayers[0];
    const rootBounds = readBounds(root);
    const contentBounds = readBounds(contentLayer);
    const relative = readRelativePosition(contentLayer, root);
    const normalizedBounds = {
      x: relative.x,
      y: relative.y,
      width: round(contentBounds.width),
      height: round(contentBounds.height)
    };
    return {
      contentBounds: normalizedBounds,
      padding: {
        left: normalizedBounds.x,
        top: normalizedBounds.y,
        right: round(rootBounds.width - normalizedBounds.x - normalizedBounds.width),
        bottom: round(rootBounds.height - normalizedBounds.y - normalizedBounds.height)
      }
    };
  }
  function convertNode(node, context, nodePath) {
    var _a, _b, _c, _d, _e;
    if (isContentMetadataNode(node)) {
      return null;
    }
    if (!context.includeHidden && "visible" in node && !node.visible) {
      context.warnings.push(`Hidden layer skipped: "${node.name}"`);
      return null;
    }
    const tags = parseLayerTags(node.name);
    if (tags.ignore) {
      return null;
    }
    if (tags.unsupportedAlign) {
      context.errors.push(`Unsupported @align value "${tags.unsupportedAlign}" on "${node.name}"`);
    }
    const cleanName = tags.cleanName || node.name;
    validateName(cleanName, node.name, context);
    const layoutBounds = readBounds(node);
    const bounds = tags.nine ? readNineSliceRenderBounds(node) : layoutBounds;
    const parentAbsolute = readAbsolutePosition(context.parentNode);
    const relative = tags.nine ? {
      x: round(bounds.x - parentAbsolute.x),
      y: round(bounds.y - parentAbsolute.y)
    } : readRelativePosition(node, context.parentNode);
    const parentOffsetX = (_b = (_a = context.parentOffset) == null ? void 0 : _a.x) != null ? _b : 0;
    const parentOffsetY = (_d = (_c = context.parentOffset) == null ? void 0 : _c.y) != null ? _d : 0;
    const scale = readRelativeScale(node);
    const hasExplicitScale = !tags.nine && (!isApproximately(scale.scaleX, 1) || !isApproximately(scale.scaleY, 1));
    const width = round(
      tags.nine ? bounds.width : node.type === "TEXT" && scale.scaleX > 0 ? node.width / scale.scaleX : node.width
    );
    const height = round(
      tags.nine ? bounds.height : node.type === "TEXT" && scale.scaleY > 0 ? node.height / scale.scaleY : node.height
    );
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      context.errors.push(`Node "${cleanName}" has invalid width/height (${width}x${height})`);
      return null;
    }
    const instanceId = buildInstanceKey(cleanName, node.id, nodePath);
    const base = {
      id: instanceId,
      name: cleanName,
      x: round(relative.x - parentOffsetX),
      y: round(relative.y - parentOffsetY),
      width,
      height,
      // A rendered-bounds PNG is already a flattened, axis-aligned image. Reapplying
      // the Figma transform would rotate/scale the exported pixels a second time.
      rotation: tags.nine ? 0 : readRotation(node),
      scaleX: hasExplicitScale ? round(scale.scaleX) : void 0,
      scaleY: hasExplicitScale ? round(scale.scaleY) : void 0,
      alpha: "opacity" in node ? round(node.opacity) : 1,
      visible: "visible" in node ? node.visible : true,
      align: readAlign(tags.align),
      debug: {
        figmaAbsolute: tags.nine ? { x: round(bounds.x), y: round(bounds.y) } : { x: round(readAbsolutePosition(node).x), y: round(readAbsolutePosition(node).y) },
        figmaRelative: { x: relative.x, y: relative.y },
        figmaSize: { width: round(node.width), height: round(node.height) },
        exportedSize: { width, height },
        transform: hasExplicitScale ? { scaleX: round(scale.scaleX), scaleY: round(scale.scaleY) } : void 0
      }
    };
    if (tags.dialog) {
      const children = [];
      if (hasRenderableChildren(node)) {
        for (const [childIndex, child] of getChildrenInPaintOrder(node).entries()) {
          const converted = convertNode(child, __spreadProps(__spreadValues({}, context), {
            parentNode: node,
            parentOffset: void 0
          }), `${nodePath}_${childIndex}`);
          if (converted) {
            children.push(converted);
          }
        }
      }
      return __spreadProps(__spreadValues({}, base), {
        type: "dialog",
        children
      });
    }
    if (tags.raster) {
      const asset2 = registerAsset(node, cleanName, bounds, context, tags);
      return __spreadProps(__spreadValues({}, base), {
        type: "raster",
        assetId: asset2.id,
        asset: asset2.src
      });
    }
    if (tags.text && node.type !== "TEXT") {
      const textDescendants = collectVisibleTextDescendants(node);
      if (textDescendants.length !== 1) {
        context.errors.push(
          `@text wrapper "${cleanName}" must contain exactly one visible text layer; found ${textDescendants.length}.`
        );
        return null;
      }
      const textNode = textDescendants[0];
      const style = readTextStyle(textNode);
      if (width > 0 && textStyleHasFixedWidth(style)) {
        style.wrap = true;
        style.wordWrapWidth = width;
      }
      const textScale = readRelativeScale(textNode);
      return __spreadProps(__spreadValues({}, base), {
        type: "text",
        text: textNode.characters,
        style,
        debug: __spreadProps(__spreadValues({}, base.debug), {
          text: {
            figmaWidth: round(textNode.width),
            figmaHeight: round(textNode.height),
            exportedWidth: width,
            exportedHeight: height,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            scaleX: round(textScale.scaleX),
            scaleY: round(textScale.scaleY),
            align: style.align,
            verticalAlign: style.verticalAlign,
            autoResize: style.autoResize
          }
        })
      });
    }
    if ((tags.text || node.type === "TEXT") && node.type === "TEXT") {
      const style = readTextStyle(node);
      if (width > 0 && textStyleHasFixedWidth(style)) {
        style.wrap = true;
        style.wordWrapWidth = width;
      }
      return __spreadProps(__spreadValues({}, base), {
        type: "text",
        text: node.characters,
        style,
        debug: __spreadProps(__spreadValues({}, base.debug), {
          text: {
            figmaWidth: round(node.width),
            figmaHeight: round(node.height),
            exportedWidth: width,
            exportedHeight: height,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            scaleX: round(scale.scaleX),
            scaleY: round(scale.scaleY),
            align: style.align,
            verticalAlign: style.verticalAlign,
            autoResize: style.autoResize
          }
        })
      });
    }
    if (tags.overlay) {
      const fill = hexFromSolidFill(node);
      return __spreadProps(__spreadValues({}, base), {
        type: "overlay",
        overlay: {
          color: fill.color ? hexToRgb(fill.color) : {
            r: 0,
            g: 0,
            b: 0,
            a: 1
          },
          opacity: typeof fill.alpha === "number" ? fill.alpha : 1
        }
      });
    }
    if (tags.nine) {
      const storedMetadata = readNineSliceMetadataFromPluginData(node, width, height);
      const legacyNameMetadata = readNineSliceMetadataFromLayerName(node.name, width, height);
      const sliceMetadata = resolveNineSliceMetadata(storedMetadata, legacyNameMetadata, width, height);
      if (sliceMetadata.source === "auto") {
        context.warnings.push(`@nine auto-detected slice used for "${cleanName}"`);
      } else if (sliceMetadata.source === "default") {
        context.warnings.push(`@nine safe default slice used for "${cleanName}"`);
      } else if (!storedMetadata && legacyNameMetadata) {
        context.warnings.push(`@nine manual slice read from layer name for "${cleanName}"`);
      }
      if ((_e = sliceMetadata.warnings) == null ? void 0 : _e.length) {
        for (const warning of sliceMetadata.warnings) {
          context.warnings.push(`@nine "${cleanName}": ${warning}`);
        }
      }
      const asset2 = registerAsset(node, cleanName, bounds, context, tags);
      return __spreadProps(__spreadValues({}, base), {
        type: "nineSlice",
        assetId: asset2.id,
        asset: asset2.src,
        slice: sliceMetadata.insets
      });
    }
    if (tags.button) {
      const children = [];
      if (hasRenderableChildren(node)) {
        for (const [childIndex, child] of getChildrenInPaintOrder(node).entries()) {
          const converted = convertNode(child, __spreadProps(__spreadValues({}, context), {
            parentNode: node,
            parentOffset: void 0
          }), `${nodePath}_${childIndex}`);
          if (converted) {
            children.push(converted);
          }
        }
      }
      return __spreadProps(__spreadValues({}, base), {
        type: "button",
        hitArea: { x: 0, y: 0, width, height },
        children
      });
    }
    if (tags.container) {
      const children = [];
      if (hasRenderableChildren(node)) {
        for (const [childIndex, child] of getChildrenInPaintOrder(node).entries()) {
          const converted = convertNode(child, __spreadProps(__spreadValues({}, context), {
            parentNode: node,
            parentOffset: void 0
          }), `${nodePath}_${childIndex}`);
          if (converted) {
            children.push(converted);
          }
        }
      }
      return __spreadProps(__spreadValues({}, base), {
        type: "container",
        children
      });
    }
    if (tags.image) {
      const asset2 = registerAsset(node, cleanName, bounds, context, tags);
      return __spreadProps(__spreadValues({}, base), {
        type: "image",
        assetId: asset2.id,
        asset: asset2.src
      });
    }
    if (hasRenderableChildren(node) && !requiresRasterAsset(node) && !tags.raster) {
      const children = [];
      for (const [childIndex, child] of getChildrenInPaintOrder(node).entries()) {
        const converted = convertNode(child, __spreadProps(__spreadValues({}, context), {
          parentNode: node,
          parentOffset: void 0
        }), `${nodePath}_${childIndex}`);
        if (converted) {
          children.push(converted);
        }
      }
      return __spreadProps(__spreadValues({}, base), {
        type: "container",
        children
      });
    }
    const asset = registerAsset(node, cleanName, bounds, context, tags);
    if (!tags.raster && !tags.image && !tags.text && !tags.button && !tags.container && !tags.overlay) {
      context.warnings.push(`Unsupported node rasterized: "${cleanName}" (${node.type})`);
    }
    return __spreadProps(__spreadValues({}, base), {
      type: "raster",
      assetId: asset.id,
      asset: asset.src
    });
  }
  function hexToRgb(hex) {
    const clean = hex.startsWith("#") ? hex.slice(1) : hex;
    return {
      r: Number.parseInt(clean.slice(0, 2), 16),
      g: Number.parseInt(clean.slice(2, 4), 16),
      b: Number.parseInt(clean.slice(4, 6), 16),
      a: 1
    };
  }
  function exportFigmaSelectionToPixiUI(root, options = {}) {
    const canvasRoot = options.useParentFrameAsCanvas !== false && root.parent && root.parent.type === "FRAME" ? root.parent : root;
    const warnings = [];
    const errors = [];
    const canvasBounds = readBounds(canvasRoot);
    const rootContentMetadata = readRootContentMetadata(canvasRoot, warnings);
    const rootTags = parseLayerTags(root.name);
    const canvasTags = parseLayerTags(canvasRoot.name);
    if (!rootTags.kind) {
      errors.push("Root must be tagged with @screen, @dialog, @hud, or @component.");
    }
    if (rootTags.cleanName.length === 0) {
      errors.push("Root clean name is empty after parsing tags.");
    }
    if (rootTags.unsupportedAlign) {
      errors.push(`Unsupported root @align value "${rootTags.unsupportedAlign}"`);
    }
    const assetBasePath = options.assetBasePath !== void 0 && options.assetBasePath !== null ? options.assetBasePath : DEFAULT_ASSET_BASE_PATH;
    const assetScale = options.assetScale !== void 0 && options.assetScale !== null ? options.assetScale : DEFAULT_ASSET_SCALE;
    const context = {
      parentNode: canvasRoot === root ? root : canvasRoot,
      rootNode: canvasRoot,
      rootName: canvasTags.cleanName || canvasRoot.name,
      parentOffset: rootContentMetadata ? {
        x: rootContentMetadata.contentBounds.x,
        y: rootContentMetadata.contentBounds.y
      } : void 0,
      assetBasePath,
      assetScale,
      includeHidden: options.includeHidden !== void 0 && options.includeHidden !== null ? options.includeHidden : false,
      assets: /* @__PURE__ */ new Map(),
      assetRequests: [],
      warnings,
      errors
    };
    const children = [];
    if (canvasRoot === root) {
      if ("children" in root && Array.isArray(root.children)) {
        for (const [childIndex, child] of getChildrenInPaintOrder(root).entries()) {
          const converted = convertNode(child, __spreadProps(__spreadValues({}, context), {
            parentNode: root,
            parentOffset: context.parentOffset
          }), String(childIndex));
          if (converted) {
            children.push(converted);
          }
        }
      }
    } else {
      const converted = convertNode(root, __spreadProps(__spreadValues({}, context), {
        parentNode: canvasRoot,
        parentOffset: context.parentOffset
      }), "0");
      if (converted) {
        children.push(converted);
      }
    }
    const rootName = canvasTags.cleanName || canvasRoot.name;
    if (rootName.includes("@")) {
      errors.push(`Raw tags leaked into exported root name "${rootName}"`);
    }
    const kind = canvasRoot === root ? rootTags.kind || "screen" : canvasTags.kind || "screen";
    const scaleMode = kind === "screen" || kind === "hud" ? "fitWidth" : "fit";
    const document = {
      version: FIGMA_PIXI_UI_SCHEMA_VERSION,
      name: rootName,
      kind,
      designSize: {
        width: round(canvasBounds.width),
        height: round(canvasBounds.height)
      },
      scaleMode,
      safeArea: {
        x: 0,
        y: 0,
        width: round(canvasBounds.width),
        height: round(canvasBounds.height)
      },
      contentBounds: rootContentMetadata == null ? void 0 : rootContentMetadata.contentBounds,
      padding: rootContentMetadata == null ? void 0 : rootContentMetadata.padding,
      modal: Boolean(canvasRoot === root ? rootTags.modal : canvasTags.modal),
      align: canvasRoot === root ? rootTags.align : canvasTags.align,
      children,
      assets: Array.from(context.assets.values()),
      meta: {
        source: "figma",
        exportedRootId: canvasRoot.id,
        validation: {
          warnings,
          errors
        }
      }
    };
    if (errors.length > 0) {
      throw new Error(errors[0]);
    }
    return {
      document,
      assetRequests: context.assetRequests,
      warnings,
      errors
    };
  }

  // code.ts
  var MAX_PREVIEW_EXPORT_SIZE = 512;
  var PREVIEW_CACHE_LIMIT = 12;
  var previewCache = /* @__PURE__ */ new Map();
  var selectionPostToken = 0;
  var documentChangeTimer;
  var autoPrepareRequestSequence = 0;
  var pendingAutoPrepareRequests = /* @__PURE__ */ new Map();
  function isNineTagged(name) {
    return /@nine(?:\(|\b)/i.test(name);
  }
  function cleanLayerName(name) {
    return name.replace(/@\w+(?:\([^)]*\))?/g, "").replace(/\s+/g, " ").trim();
  }
  function readNineSliceRenderSize(node) {
    if (!("absoluteRenderBounds" in node)) {
      return void 0;
    }
    const bounds = node.absoluteRenderBounds;
    if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height) || bounds.width <= 0 || bounds.height <= 0) {
      return void 0;
    }
    return { width: bounds.width, height: bounds.height };
  }
  function requireNineSliceRenderSize(node) {
    const size = readNineSliceRenderSize(node);
    if (!size) {
      throw new Error(`@nine node "${cleanLayerName(node.name) || node.name}" has no visible rendered pixels.`);
    }
    return size;
  }
  function readStoredNineSliceMetadata(node, width, height) {
    return parseNineSliceMetadataString(node.getPluginData(NINE_SLICE_PLUGIN_KEY), width, height);
  }
  function writeNineSliceMetadata(node, metadata) {
    node.setPluginData(NINE_SLICE_PLUGIN_KEY, serializeNineSliceMetadata(metadata));
  }
  function resolveNodeNineSliceMetadata(node, width, height) {
    const storedMetadata = readStoredNineSliceMetadata(node, width, height);
    const layerNameMetadata = readNineSliceMetadataFromLayerName(node.name, width, height);
    return {
      storedMetadata,
      layerNameMetadata,
      resolvedMetadata: resolveNineSliceMetadata(storedMetadata, layerNameMetadata, width, height)
    };
  }
  function shouldSkipAutoDetection(node, storedMetadata, layerNameMetadata) {
    return (storedMetadata == null ? void 0 : storedMetadata.source) === "manual" || Boolean(layerNameMetadata);
  }
  function isFreshCachedNineSlice(metadata, assetHash) {
    if (!metadata || metadata.source === "manual") {
      return false;
    }
    return (metadata.source === "auto" || metadata.source === "default") && metadata.assetHash === assetHash && metadata.algorithmVersion === AUTO_NINE_SLICE_ALGORITHM_VERSION;
  }
  function pushNineSliceMetadataWarnings(warnings, nodeName, metadata) {
    var _a;
    if (!((_a = metadata == null ? void 0 : metadata.warnings) == null ? void 0 : _a.length)) {
      return;
    }
    for (const warning of metadata.warnings) {
      warnings.push(`@nine "${nodeName}": ${warning}`);
    }
  }
  function getSelectionInfo() {
    const selection = figma.currentPage.selection;
    if (selection.length !== 1) {
      return {
        hasSelection: false,
        message: "Select one layer.",
        isNine: false
      };
    }
    const node = selection[0];
    const isNine = isNineTagged(node.name);
    const size = isNine ? readNineSliceRenderSize(node) : { width: node.width, height: node.height };
    if (!size) {
      return {
        hasSelection: true,
        nodeId: node.id,
        name: node.name,
        cleanName: cleanLayerName(node.name),
        width: 0,
        height: 0,
        isNine,
        renderBoundsError: true,
        hasManualOverride: false,
        message: "This @nine layer has no visible rendered pixels."
      };
    }
    const { storedMetadata, layerNameMetadata, resolvedMetadata } = resolveNodeNineSliceMetadata(
      node,
      size.width,
      size.height
    );
    const hasManualOverride = (storedMetadata == null ? void 0 : storedMetadata.source) === "manual" || Boolean(layerNameMetadata);
    return {
      hasSelection: true,
      nodeId: node.id,
      name: node.name,
      cleanName: cleanLayerName(node.name),
      width: size.width,
      height: size.height,
      isNine,
      storedMetadata,
      layerNameMetadata,
      resolvedMetadata,
      slice: resolvedMetadata.insets,
      hasManualOverride,
      message: isNine ? resolvedMetadata.source === "manual" ? "Manual nine-slice override loaded." : resolvedMetadata.source === "auto" ? "Auto-detected nine-slice loaded." : "Safe default nine-slice loaded." : "Selected node is not tagged with @nine."
    };
  }
  function computePreviewScale(width, height) {
    const longestSide = Math.max(1, width, height);
    return Math.min(1, MAX_PREVIEW_EXPORT_SIZE / longestSide);
  }
  function rememberPreview(cacheKey, bytes, assetHash) {
    if (previewCache.has(cacheKey)) {
      previewCache.delete(cacheKey);
    }
    previewCache.set(cacheKey, { bytes, assetHash });
    while (previewCache.size > PREVIEW_CACHE_LIMIT) {
      const [oldestKey] = previewCache.keys();
      previewCache.delete(oldestKey);
    }
  }
  async function postNineSlicePreview(selectionInfo, token) {
    if (!selectionInfo.hasSelection || !selectionInfo.isNine || !selectionInfo.nodeId) {
      figma.ui.postMessage({ type: "nine-slice-preview-cleared" });
      return;
    }
    if (selectionInfo.renderBoundsError) {
      figma.ui.postMessage({
        type: "nine-slice-preview-error",
        payload: {
          nodeId: selectionInfo.nodeId,
          message: selectionInfo.message
        }
      });
      return;
    }
    const node = figma.getNodeById(selectionInfo.nodeId);
    if (!node || !("exportAsync" in node)) {
      figma.ui.postMessage({
        type: "nine-slice-preview-error",
        payload: {
          nodeId: selectionInfo.nodeId,
          message: "Selected node cannot be exported for preview."
        }
      });
      return;
    }
    const previewScale = computePreviewScale(selectionInfo.width, selectionInfo.height);
    const cacheKey = [
      selectionInfo.nodeId,
      Math.round(selectionInfo.width * 1e3) / 1e3,
      Math.round(selectionInfo.height * 1e3) / 1e3,
      Math.round(previewScale * 1e4) / 1e4
    ].join(":");
    const cached = previewCache.get(cacheKey);
    if (cached) {
      figma.ui.postMessage({
        type: "nine-slice-preview",
        payload: {
          nodeId: selectionInfo.nodeId,
          width: selectionInfo.width,
          height: selectionInfo.height,
          previewScale,
          cacheKey,
          assetHash: cached.assetHash,
          bytes: cached.bytes
        }
      });
      return;
    }
    try {
      const bytes = await node.exportAsync({
        format: "PNG",
        useAbsoluteBounds: false,
        constraint: {
          type: "SCALE",
          value: previewScale
        }
      });
      if (token !== selectionPostToken) {
        return;
      }
      const assetHash = hashBytes(bytes);
      rememberPreview(cacheKey, bytes, assetHash);
      figma.ui.postMessage({
        type: "nine-slice-preview",
        payload: {
          nodeId: selectionInfo.nodeId,
          width: selectionInfo.width,
          height: selectionInfo.height,
          previewScale,
          cacheKey,
          assetHash,
          bytes
        }
      });
    } catch (error) {
      if (token !== selectionPostToken) {
        return;
      }
      figma.ui.postMessage({
        type: "nine-slice-preview-error",
        payload: {
          nodeId: selectionInfo.nodeId,
          message: `Could not export selected node preview: ${error instanceof Error ? error.message : String(error)}`
        }
      });
    }
  }
  function postSelectionInfo() {
    const token = ++selectionPostToken;
    const payload = getSelectionInfo();
    figma.ui.postMessage({
      type: "selection-info",
      payload
    });
    void postNineSlicePreview(payload, token);
  }
  function scheduleSelectionInfoPost() {
    if (documentChangeTimer !== void 0) {
      clearTimeout(documentChangeTimer);
    }
    documentChangeTimer = setTimeout(() => {
      postSelectionInfo();
    }, 150);
  }
  function parseIncomingInsets(payload) {
    return {
      left: Number(payload.left),
      top: Number(payload.top),
      right: Number(payload.right),
      bottom: Number(payload.bottom)
    };
  }
  function exportPreviewCacheKey(node) {
    const size = requireNineSliceRenderSize(node);
    const previewScale = computePreviewScale(size.width, size.height);
    return [
      node.id,
      Math.round(size.width * 1e3) / 1e3,
      Math.round(size.height * 1e3) / 1e3,
      Math.round(previewScale * 1e4) / 1e4
    ].join(":");
  }
  async function exportPreviewForNode(node) {
    const cacheKey = exportPreviewCacheKey(node);
    const cached = previewCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const size = requireNineSliceRenderSize(node);
    const bytes = await node.exportAsync({
      format: "PNG",
      useAbsoluteBounds: false,
      constraint: {
        type: "SCALE",
        value: computePreviewScale(size.width, size.height)
      }
    });
    const assetHash = hashBytes(bytes);
    rememberPreview(cacheKey, bytes, assetHash);
    return { bytes, assetHash };
  }
  function collectNineSliceNodes(root) {
    const result = [];
    const visit = (node) => {
      if (!node.visible) {
        return;
      }
      if (isNineTagged(node.name)) {
        result.push(node);
      }
      if ("children" in node) {
        for (const child of node.children) {
          visit(child);
        }
      }
    };
    visit(root);
    return result;
  }
  function requestAutoNineSliceAnalysis(items) {
    if (items.length === 0) {
      return Promise.resolve([]);
    }
    const requestId = `auto-nine-${++autoPrepareRequestSequence}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingAutoPrepareRequests.delete(requestId);
        reject(new Error("Nine-slice auto-detection timed out."));
      }, 1e4);
      pendingAutoPrepareRequests.set(requestId, { resolve, reject, timer });
      figma.ui.postMessage({
        type: "prepare-auto-nine-slice",
        payload: {
          requestId,
          items
        }
      });
    });
  }
  function storeResolvedAutoMetadata(node, metadata) {
    var _a;
    const size = requireNineSliceRenderSize(node);
    const sanitized = sanitizeNineSliceInsets(metadata.insets, size.width, size.height);
    const validation = validateNineSliceInsets(sanitized, size.width, size.height);
    if (validation) {
      return;
    }
    writeNineSliceMetadata(node, __spreadProps(__spreadValues({}, metadata), {
      approved: false,
      insets: sanitized,
      generatedAt: (_a = metadata.generatedAt) != null ? _a : Date.now()
    }));
  }
  async function prepareAutoNineSliceNodes(root) {
    var _a;
    const warnings = [];
    const analysisQueue = [];
    const defaultsToStore = [];
    for (const node of collectNineSliceNodes(root)) {
      const nodeName = cleanLayerName(node.name) || node.name;
      const size = requireNineSliceRenderSize(node);
      const { storedMetadata, layerNameMetadata } = resolveNodeNineSliceMetadata(node, size.width, size.height);
      if (shouldSkipAutoDetection(node, storedMetadata, layerNameMetadata)) {
        continue;
      }
      if (!("exportAsync" in node)) {
        defaultsToStore.push({
          node,
          metadata: {
            source: "default",
            approved: false,
            insets: createSafeDefaultNineSlice(size.width, size.height),
            algorithmVersion: AUTO_NINE_SLICE_ALGORITHM_VERSION,
            mode: "fallback",
            warnings: ["Preview export is unavailable; using safe default slices."],
            generatedAt: Date.now()
          }
        });
        warnings.push(`Used safe default nine-slice for "${nodeName}" because preview export is unavailable.`);
        continue;
      }
      try {
        const preview = await exportPreviewForNode(node);
        if (isFreshCachedNineSlice(storedMetadata, preview.assetHash)) {
          pushNineSliceMetadataWarnings(warnings, nodeName, storedMetadata);
          continue;
        }
        analysisQueue.push({
          nodeId: node.id,
          name: nodeName,
          width: size.width,
          height: size.height,
          assetHash: preview.assetHash,
          bytes: preview.bytes
        });
      } catch (error) {
        defaultsToStore.push({
          node,
          metadata: {
            source: "default",
            approved: false,
            insets: createSafeDefaultNineSlice(size.width, size.height),
            algorithmVersion: AUTO_NINE_SLICE_ALGORITHM_VERSION,
            mode: "fallback",
            warnings: [
              `Preview export failed before auto-detection: ${error instanceof Error ? error.message : String(error)}`
            ],
            generatedAt: Date.now()
          }
        });
        warnings.push(
          `Used safe default nine-slice for "${nodeName}" because preview export failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    for (const entry of defaultsToStore) {
      storeResolvedAutoMetadata(entry.node, entry.metadata);
    }
    if (analysisQueue.length === 0) {
      return warnings;
    }
    let responses;
    try {
      responses = await requestAutoNineSliceAnalysis(analysisQueue);
    } catch (error) {
      for (const item of analysisQueue) {
        const node = figma.getNodeById(item.nodeId);
        if (!node || node.type === "DOCUMENT" || node.type === "PAGE") {
          continue;
        }
        const size = requireNineSliceRenderSize(node);
        storeResolvedAutoMetadata(node, {
          source: "default",
          approved: false,
          insets: createSafeDefaultNineSlice(size.width, size.height),
          assetHash: item.assetHash,
          algorithmVersion: AUTO_NINE_SLICE_ALGORITHM_VERSION,
          mode: "fallback",
          warnings: [
            `Auto-detection failed before analysis completed: ${error instanceof Error ? error.message : String(error)}`
          ],
          generatedAt: Date.now()
        });
        warnings.push(
          `Used safe default nine-slice for "${item.name}" because auto-detection failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      return warnings;
    }
    const responseByNodeId = new Map(responses.map((response) => [response.nodeId, response]));
    for (const item of analysisQueue) {
      const node = figma.getNodeById(item.nodeId);
      if (!node || node.type === "DOCUMENT" || node.type === "PAGE") {
        continue;
      }
      const response = responseByNodeId.get(item.nodeId);
      const size = requireNineSliceRenderSize(node);
      const metadata = (response == null ? void 0 : response.metadata) && validateNineSliceInsets(response.metadata.insets, size.width, size.height) === null ? response.metadata : {
        source: "default",
        approved: false,
        insets: createSafeDefaultNineSlice(size.width, size.height),
        assetHash: item.assetHash,
        algorithmVersion: AUTO_NINE_SLICE_ALGORITHM_VERSION,
        mode: "fallback",
        warnings: ["Auto-detection response was invalid; using safe default slices."],
        generatedAt: Date.now()
      };
      storeResolvedAutoMetadata(node, __spreadProps(__spreadValues({}, metadata), {
        source: metadata.source === "manual" ? "auto" : metadata.source,
        approved: false,
        assetHash: (_a = metadata.assetHash) != null ? _a : item.assetHash
      }));
      if (metadata.source === "default") {
        warnings.push(`Used safe default nine-slice for "${item.name}".`);
      }
      pushNineSliceMetadataWarnings(warnings, item.name, metadata);
    }
    return warnings;
  }
  function handleSaveNineSlice(payload) {
    const selection = figma.currentPage.selection;
    if (selection.length !== 1) {
      figma.ui.postMessage({ type: "nine-slice-error", message: "Select one @nine layer first." });
      return;
    }
    const node = selection[0];
    if (!isNineTagged(node.name)) {
      figma.ui.postMessage({ type: "nine-slice-error", message: "Selected layer is not tagged @nine." });
      return;
    }
    const size = readNineSliceRenderSize(node);
    if (!size) {
      figma.ui.postMessage({ type: "nine-slice-error", message: "This @nine layer has no visible rendered pixels." });
      return;
    }
    const data = sanitizeNineSliceInsets(parseIncomingInsets(payload), size.width, size.height);
    const error = validateNineSliceInsets(data, size.width, size.height);
    if (error) {
      figma.ui.postMessage({ type: "nine-slice-error", message: error });
      return;
    }
    writeNineSliceMetadata(node, {
      source: "manual",
      approved: true,
      confidence: typeof payload.confidence === "number" ? payload.confidence : 1,
      insets: data,
      assetHash: typeof payload.assetHash === "string" && payload.assetHash.trim() ? payload.assetHash : void 0,
      generatedAt: Date.now()
    });
    figma.ui.postMessage({ type: "nine-slice-saved", message: "Manual nine-slice override saved." });
    postSelectionInfo();
  }
  function handleApplyAutoNineSlice(payload) {
    var _a;
    const selection = figma.currentPage.selection;
    if (selection.length !== 1) {
      figma.ui.postMessage({ type: "nine-slice-error", message: "Select one @nine layer first." });
      return;
    }
    const node = selection[0];
    if (!isNineTagged(node.name)) {
      figma.ui.postMessage({ type: "nine-slice-error", message: "Selected layer is not tagged @nine." });
      return;
    }
    const candidate = payload.metadata;
    if (!candidate) {
      figma.ui.postMessage({ type: "nine-slice-error", message: "Missing auto-detected nine-slice payload." });
      return;
    }
    const size = readNineSliceRenderSize(node);
    if (!size) {
      figma.ui.postMessage({ type: "nine-slice-error", message: "This @nine layer has no visible rendered pixels." });
      return;
    }
    const sanitized = sanitizeNineSliceInsets(candidate.insets, size.width, size.height);
    const validation = validateNineSliceInsets(sanitized, size.width, size.height);
    if (validation) {
      figma.ui.postMessage({ type: "nine-slice-error", message: validation });
      return;
    }
    writeNineSliceMetadata(node, __spreadProps(__spreadValues({}, candidate), {
      source: candidate.source === "default" ? "default" : "auto",
      approved: false,
      insets: sanitized,
      generatedAt: (_a = candidate.generatedAt) != null ? _a : Date.now()
    }));
    figma.ui.postMessage({ type: "nine-slice-auto-applied", message: "Auto-detected nine-slice applied." });
    postSelectionInfo();
  }
  function handleCacheAutoNineSlice(payload) {
    var _a;
    if (!payload.nodeId || !payload.metadata) {
      return;
    }
    const node = figma.getNodeById(payload.nodeId);
    if (!node || node.type === "DOCUMENT" || node.type === "PAGE") {
      return;
    }
    const size = readNineSliceRenderSize(node);
    if (!size) {
      return;
    }
    const { storedMetadata, layerNameMetadata } = resolveNodeNineSliceMetadata(node, size.width, size.height);
    if (shouldSkipAutoDetection(node, storedMetadata, layerNameMetadata)) {
      return;
    }
    storeResolvedAutoMetadata(node, __spreadProps(__spreadValues({}, payload.metadata), {
      source: payload.metadata.source === "default" ? "default" : "auto",
      approved: false,
      generatedAt: (_a = payload.metadata.generatedAt) != null ? _a : Date.now()
    }));
  }
  figma.showUI(__html__, { width: 480, height: 700 });
  figma.on("selectionchange", () => {
    postSelectionInfo();
  });
  if (typeof figma.on === "function") {
    try {
      figma.on("documentchange", () => {
        scheduleSelectionInfoPost();
      });
    } catch (e) {
    }
  }
  figma.ui.onmessage = async (message) => {
    if (message.type === "saveNineSlice") {
      handleSaveNineSlice(message);
      return;
    }
    if (message.type === "applyAutoNineSlice") {
      handleApplyAutoNineSlice(message);
      return;
    }
    if (message.type === "cacheAutoNineSlice") {
      handleCacheAutoNineSlice(message);
      return;
    }
    if (message.type === "prepare-auto-nine-slice-result") {
      const requestId = typeof message.requestId === "string" ? message.requestId : "";
      const pending = pendingAutoPrepareRequests.get(requestId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingAutoPrepareRequests.delete(requestId);
        pending.resolve(Array.isArray(message.results) ? message.results : []);
      }
      return;
    }
    if (message.type === "requestSelectionInfo") {
      postSelectionInfo();
      return;
    }
    if (message.type !== "exportSelection") {
      return;
    }
    const selectedRoots = figma.currentPage.selection.filter(
      (node) => "absoluteBoundingBox" in node
    );
    if (selectedRoots.length === 0) {
      figma.notify("Select one or more @screen, @dialog, @hud, or @component roots to export.");
      return;
    }
    if (selectedRoots.length > 1) {
      const invalidRoots = selectedRoots.filter((node) => !parseLayerTags(node.name).kind);
      if (invalidRoots.length > 0) {
        figma.ui.postMessage({
          type: "export-error",
          message: `Bundle export requires every selected root to use @screen, @dialog, @hud, or @component. Missing root tag: "${invalidRoots[0].name}".`
        });
        return;
      }
    }
    try {
      const assetBasePath = message.assetBasePath || "assets/ui";
      const exportDocuments = [];
      const documentAssets = [];
      const allWarnings = [];
      const allErrors = [];
      for (const selection of selectedRoots) {
        const autoNineSliceWarnings = await prepareAutoNineSliceNodes(selection);
        const exported = exportFigmaSelectionToPixiUI(selection, {
          assetBasePath,
          assetScale: Number(message.assetScale || 1)
        });
        const assets = [];
        for (const request of exported.assetRequests) {
          const node = figma.getNodeById(request.nodeId);
          if (!node || !("exportAsync" in node)) {
            figma.ui.postMessage({
              type: "export-error",
              message: `Missing export node for asset request "${request.fileName}".`
            });
            return;
          }
          try {
            const bytes = await node.exportAsync({
              format: "PNG",
              useAbsoluteBounds: false,
              constraint: {
                type: "SCALE",
                value: request.scale
              }
            });
            assets.push({
              assetId: request.assetId,
              fileName: request.fileName,
              name: request.name,
              nameSource: request.nameSource,
              explicitName: request.explicitName,
              bytes
            });
          } catch (error) {
            figma.ui.postMessage({
              type: "export-error",
              message: `Failed to export PNG for "${request.fileName}": ${error instanceof Error ? error.message : String(error)}`
            });
            return;
          }
        }
        exportDocuments.push(exported.document);
        documentAssets.push({ document: exported.document, assets });
        allWarnings.push(...autoNineSliceWarnings, ...exported.warnings);
        allErrors.push(...exported.errors);
      }
      const finalized = finalizeExportedAssetsForDocuments({
        documents: documentAssets,
        assetBasePath,
        sharedMode: "reused-only"
      });
      figma.ui.postMessage({
        type: "export-complete",
        document: exportDocuments[0],
        documents: exportDocuments,
        bundle: exportDocuments.length > 1,
        assets: finalized.assets,
        manifest: finalized.manifest,
        warnings: allWarnings,
        errors: allErrors
      });
    } catch (error) {
      figma.ui.postMessage({
        type: "export-error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };
  postSelectionInfo();
})();
//# sourceMappingURL=code.js.map
