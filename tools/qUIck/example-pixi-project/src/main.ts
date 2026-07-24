import { UIFactory } from "@figma-pixi/pixi-runtime";
import { Application } from "pixi.js";

function makeExportPath(name: string): string {
  return `/generated-ui/${name}.json`;
}

function getRequestedUiName(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("ui");
}

interface ResolvedExportJson {
  path: string;
  data: unknown;
}

async function resolveExportJson(): Promise<ResolvedExportJson> {
  const requestedUi = getRequestedUiName();
  const candidates = requestedUi
    ? [makeExportPath(requestedUi)]
    : [
        makeExportPath("StartDialog"),
        makeExportPath("startDialog"),
        makeExportPath("startdialog"),
        makeExportPath("HomeScreen")
      ];
  const errors: string[] = [];

  for (const path of candidates) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) {
        errors.push(`${path} (HTTP ${response.status})`);
        continue;
      }

      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();
      const trimmed = text.trimStart();
      if (
        contentType.includes("text/html") ||
        trimmed.startsWith("<!doctype html") ||
        trimmed.startsWith("<html")
      ) {
        errors.push(`${path} (not a JSON file)`);
        continue;
      }

      const data = JSON.parse(text);
      if (path !== makeExportPath("StartDialog")) {
        console.warn(`[UI] "${makeExportPath("StartDialog")}" not found. Using "${path}"`);
      }
      return { path, data };
    } catch {
      errors.push(`${path} (invalid JSON)`);
    }
  }

  throw new Error(
    `Could not find a valid UI export JSON. Tried: ${errors.join(", ")}`
  );
}

function showBootError(message: string): void {
  const el = document.createElement("pre");
  el.textContent = message;
  el.style.margin = "0";
  el.style.padding = "16px";
  el.style.color = "#ff8a8a";
  el.style.background = "#1b1111";
  el.style.fontFamily = "Consolas, monospace";
  el.style.fontSize = "14px";
  document.body.appendChild(el);
}

async function bootstrap(): Promise<void> {
  const debug = new URLSearchParams(window.location.search).get("debug") === "1";

  try {
    const resolved = await resolveExportJson();
    const jsonPath = resolved.path;
    type RuntimeExportData = Parameters<UIFactory["createScreen"]>[0];
    const exportData = resolved.data as RuntimeExportData;

    const app = new Application();
    await app.init({
      background: "#101420",
      resizeTo: window
    });

    document.body.style.margin = "0";
    document.body.appendChild(app.canvas);

    console.info(`[UI] Loaded ${jsonPath}`);

    const factory = new UIFactory({
      debug,
      debugDrawBounds: debug,
      debugShowNames: debug
    });
    await factory.loadAssets(exportData);
    const dialog = await factory.createScreen(exportData);
    (window as Window & { __dialog?: unknown }).__dialog = dialog;

    app.stage.addChild(dialog);
    dialog.resize(app.screen.width, app.screen.height);

    for (const textName of ["title_level", "txt_section_title", "txt_start"]) {
      const textNode = dialog.getText(textName);
      const summary = {
        name: textName,
        found: Boolean(textNode),
        text: textNode?.text,
        visible: textNode?.visible,
        alpha: textNode?.alpha,
        width: textNode?.width,
        height: textNode?.height,
        style: textNode?.style ? {
          fontFamily: textNode.style.fontFamily,
          fontSize: textNode.style.fontSize,
          fontWeight: textNode.style.fontWeight,
          fill: textNode.style.fill
        } : undefined
      };
      console.info(`[UI][text-check] ${JSON.stringify(summary)}`);
    }

    const start = dialog.getButton("btn_start");
    start?.onClick(() => {
      console.log("start clicked");
    });

    const close = dialog.getButton("btn_close");
    close?.onClick(() => {
      dialog.hide();
    });

    const boosterBag = dialog.getButton("btn_booster_bag");
    boosterBag?.onClick(() => {
      console.log("booster bag clicked");
    });

    const boosterGate = dialog.getButton("btn_booster_gate");
    boosterGate?.onClick(() => {
      console.log("booster gate clicked");
    });

    window.addEventListener("resize", () => {
      dialog.resize(app.screen.width, app.screen.height);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[UI] bootstrap failed:", message);
    showBootError(`[UI] bootstrap failed\n${message}`);
  }
}

void bootstrap();
