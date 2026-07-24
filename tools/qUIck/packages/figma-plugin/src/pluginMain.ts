import { parseLayerName } from "@figma-pixi/shared";
import { exportSelectedRootAsUI, type ExportUIOptions } from "./exporter.js";

const NINE_PLUGIN_DATA_KEY = "nineSlice";

interface SlicePayload {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

type PluginMessagePayload = SlicePayload & ExportUIOptions;

function getSelectedNode(): SceneNode | null {
  return figma.currentPage.selection.length === 1 ? figma.currentPage.selection[0] : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createSafeDefaultNineSlice(width: number, height: number): SlicePayload {
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

function getNineNodeInfo() {
  const node = getSelectedNode();
  if (!node) {
    return { ok: false, reason: "Select one node." };
  }

  const parsed = parseLayerName(node.name);
  if (!parsed.tags.nine) {
    return { ok: false, reason: "Selected node is not tagged @nine." };
  }

  const pluginRaw = "getPluginData" in node ? node.getPluginData(NINE_PLUGIN_DATA_KEY) : "";
  let pluginSlice: Partial<SlicePayload> | undefined;
  if (pluginRaw) {
    try {
      pluginSlice = JSON.parse(pluginRaw) as Partial<SlicePayload>;
    } catch {
      pluginSlice = undefined;
    }
  }

  const defaultSlice = createSafeDefaultNineSlice(node.width, node.height);
  const slice: SlicePayload = {
    left: pluginSlice?.left ?? parsed.nineSlice?.left ?? defaultSlice.left,
    top: pluginSlice?.top ?? parsed.nineSlice?.top ?? defaultSlice.top,
    right: pluginSlice?.right ?? parsed.nineSlice?.right ?? defaultSlice.right,
    bottom: pluginSlice?.bottom ?? parsed.nineSlice?.bottom ?? defaultSlice.bottom
  };

  return {
    ok: true,
    nodeId: node.id,
    name: parsed.cleanName || node.name,
    width: node.width,
    height: node.height,
    slice
  };
}

function renderUIHtml(): string {
  return `<html><body style="font:12px Inter, sans-serif; margin:12px;">
    <h3 style="margin:0 0 8px 0;">Figma → Pixi Export</h3>
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <button id="btnRefresh">Refresh Selection</button>
      <button id="btnSave">Save Nine Slice</button>
      <button id="btnExport">Run Export</button>
    </div>
    <div id="selStatus"></div>
    <div id="slicePanel" style="margin-top:8px;">
      <div id="meta"></div>
      <div style="display:grid;grid-template-columns:80px 1fr;gap:6px;max-width:280px;margin-top:6px;">
        <label>Left</label><input id="left" type="number" min="0" step="1" />
        <label>Top</label><input id="top" type="number" min="0" step="1" />
        <label>Right</label><input id="right" type="number" min="0" step="1" />
        <label>Bottom</label><input id="bottom" type="number" min="0" step="1" />
      </div>
      <canvas id="slicePreview" width="260" height="180" style="border:1px solid #ccc;margin-top:8px;"></canvas>
    </div>
    <div id="exportStatus" style="margin-top:10px;"></div>
    <div style="margin-top:10px;">
      <label style="display:flex;align-items:center;gap:8px;">
        <input id="useParentFrameAsCanvas" type="checkbox" checked />
        <span>Use parent frame/artboard as canvas</span>
      </label>
    </div>
    <div id="summary" style="margin-top:10px; white-space:pre-wrap;"></div>
    <div id="warnings" style="margin-top:10px;"></div>
    <div id="errors" style="margin-top:10px;"></div>
    <script>
      let selected = null;
      const $ = (id) => document.getElementById(id);
      const left = $('left'); const topV = $('top'); const right = $('right'); const bottom = $('bottom');

      function list(title, items, color){
        return '<div style="font-weight:600;color:'+color+'">'+title+' ('+items.length+')</div>' +
          (items.length ? '<ul style="margin:4px 0 0 16px;padding:0;">'+items.map(i=>'<li>'+i+'</li>').join('')+'</ul>' : '<div>none</div>');
      }

      function drawSlicePreview() {
        const canvas = $('slicePreview');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0,0,canvas.width,canvas.height);
        if (!selected || !selected.ok) return;
        const pad = 12;
        const w = canvas.width - pad * 2;
        const h = canvas.height - pad * 2;
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(pad, pad, w, h);
        ctx.strokeStyle = '#666'; ctx.strokeRect(pad, pad, w, h);

        const sx = w / selected.width;
        const sy = h / selected.height;
        const l = Number(left.value || 0) * sx;
        const t = Number(topV.value || 0) * sy;
        const r = Number(right.value || 0) * sx;
        const b = Number(bottom.value || 0) * sy;

        ctx.fillStyle = 'rgba(26,115,232,0.14)';
        ctx.fillRect(pad + l, pad + t, Math.max(0, w - l - r), Math.max(0, h - t - b));

        ctx.strokeStyle = '#1a73e8';
        ctx.beginPath(); ctx.moveTo(pad + l, pad); ctx.lineTo(pad + l, pad + h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pad + w - r, pad); ctx.lineTo(pad + w - r, pad + h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pad, pad + t); ctx.lineTo(pad + w, pad + t); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pad, pad + h - b); ctx.lineTo(pad + w, pad + h - b); ctx.stroke();
      }

      function requestSelection() {
        parent.postMessage({ pluginMessage: { type: 'request-selection' } }, '*');
      }

      $('btnRefresh').onclick = requestSelection;
      $('btnSave').onclick = () => {
        parent.postMessage({
          pluginMessage: {
            type: 'save-slice',
            payload: {
              left: Number(left.value || 0),
              top: Number(topV.value || 0),
              right: Number(right.value || 0),
              bottom: Number(bottom.value || 0)
            }
          }
        }, '*');
      };
      $('btnExport').onclick = () => {
        parent.postMessage({
          pluginMessage: {
            type: 'run-export',
            payload: {
              useParentFrameAsCanvas: Boolean($('useParentFrameAsCanvas').checked)
            }
          }
        }, '*');
      };
      [left, topV, right, bottom].forEach((el) => el.addEventListener('input', drawSlicePreview));

      window.onmessage = (event) => {
        const msg = event.data.pluginMessage;
        if (msg?.type === 'selection-info') {
          selected = msg.payload;
          const status = $('selStatus');
          const meta = $('meta');
          if (!selected.ok) {
            status.textContent = selected.reason;
            meta.textContent = '';
            drawSlicePreview();
            return;
          }
          status.textContent = 'Ready';
          meta.textContent = selected.name + '  (' + Math.round(selected.width) + ' x ' + Math.round(selected.height) + ')';
          left.value = String(selected.slice.left);
          topV.value = String(selected.slice.top);
          right.value = String(selected.slice.right);
          bottom.value = String(selected.slice.bottom);
          drawSlicePreview();
        }
        if (msg?.type === 'slice-saved') {
          $('selStatus').textContent = 'Nine slice saved';
          requestSelection();
        }
        if (msg?.type === 'export-result') {
          const r = msg.payload.report;
          $('exportStatus').textContent = r.errors.length ? 'Export blocked by validation errors.' : 'Export complete.';
          $('summary').textContent =
            'Nodes: ' + r.summary.nodeCount + '\\n' +
            'Raster assets: ' + r.summary.rasterAssetCount + '\\n' +
            'Text nodes: ' + r.summary.textNodeCount + '\\n' +
            'Buttons: ' + r.summary.buttonCount + '\\n' +
            'NineSlice nodes: ' + r.summary.nineSliceCount;
          $('warnings').innerHTML = list('Warnings', r.warnings, '#9a6a00');
          $('errors').innerHTML = list('Errors', r.errors, '#b00020');
        }
        if (msg?.type === 'export-error') {
          $('exportStatus').textContent = 'Export failed';
          $('errors').innerHTML = list('Errors', [msg.payload.message], '#b00020');
        }
      };
      requestSelection();
    </script>
  </body></html>`;
}

function postSelectionInfo(): void {
  figma.ui.postMessage({
    type: "selection-info",
    payload: getNineNodeInfo()
  });
}

function saveSliceToSelection(payload: SlicePayload): void {
  const node = getSelectedNode();
  if (!node) {
    figma.notify("Select one @nine node first.", { error: true });
    return;
  }
  if (!("setPluginData" in node)) {
    figma.notify("This node does not support plugin data.", { error: true });
    return;
  }
  node.setPluginData(NINE_PLUGIN_DATA_KEY, JSON.stringify(payload));
  figma.ui.postMessage({ type: "slice-saved" });
}

async function runExport(options: ExportUIOptions = {}): Promise<void> {
  try {
    const result = await exportSelectedRootAsUI(options);
    if (result.report.errors.length > 0) {
      figma.notify(`Validation failed (${result.report.errors.length} errors).`, { error: true });
    } else {
      figma.notify(`Exported ${result.json.name} (${result.assets.length} assets)`);
    }
    figma.ui.postMessage({
      type: "export-result",
      payload: {
        json: result.json,
        report: result.report,
        assets: result.assets.map((asset) => ({
          id: asset.id,
          src: asset.src,
          bytes: Array.from(asset.bytes)
        }))
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown export error";
    figma.notify(message, { error: true });
    figma.ui.postMessage({ type: "export-error", payload: { message } });
  }
}

export async function runPluginExport(): Promise<void> {
  figma.showUI(renderUIHtml(), { width: 560, height: 760, themeColors: true });

  figma.on("selectionchange", () => {
    postSelectionInfo();
  });

  figma.ui.onmessage = async (msg: { type?: string; payload?: PluginMessagePayload }) => {
    if (msg.type === "request-selection") {
      postSelectionInfo();
      return;
    }
    if (msg.type === "save-slice" && msg.payload) {
      saveSliceToSelection(msg.payload);
      return;
    }
    if (msg.type === "run-export") {
      await runExport(msg.payload ?? {});
    }
  };

  postSelectionInfo();
}
