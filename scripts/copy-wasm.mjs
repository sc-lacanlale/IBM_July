/**
 * Copy MediaPipe tasks-vision WASM into public/ for offline Android builds.
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const dest = join(root, "public", "wasm");

if (!existsSync(src)) {
  console.error(`[copy-wasm] source not found: ${src} — run npm install first`);
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`[copy-wasm] copied MediaPipe WASM -> ${dest}`);
