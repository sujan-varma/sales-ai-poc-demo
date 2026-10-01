// Builds the self-contained single-file HTML export:
//   dist/Sales AI - Option B.html — the Option B flow (ASM dashboard #asm, Leadership #leadership)
// All JS (React, components, icons), CSS and brand images are inlined; the only
// external reference is Google Fonts (IBM Plex Sans / Mono, Instrument Serif),
// which falls back to system fonts when offline.
//
//   npm run export:html     (the backend must be running: the Excel data is fetched from
//                            ${NEXT_PUBLIC_API_URL:-http://localhost:8000}/api/web/bootstrap and embedded)

import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TARGETS = [
  { entry: "src/standalone/optionB.tsx", out: "dist/Sales AI - Option B.html", title: "Sales AI — Option B" },
];

// 1. CSS — Tailwind utilities + the project's globals
const cssTmp = join(tmpdir(), `cortex-standalone-${process.pid}.css`);
// npx is npx.cmd on Windows, which needs a shell
execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tailwindcss", "-c", "scripts/tailwind.standalone.config.ts", "-i", "src/app/globals.css", "-o", cssTmp, "--minify"],
  { stdio: ["ignore", "ignore", "inherit"], shell: process.platform === "win32" }
);
const css = readFileSync(cssTmp, "utf8");

// 0. Data — the Excel-backed payload, embedded so the file still works offline
const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
const res = await fetch(`${API}/api/web/bootstrap`).catch((e) => {
  throw new Error(`Could not reach the backend at ${API} (${e.message}). Start it first: see backend/README.md`);
});
const payload = await res.json();
if (!payload.success) throw new Error(`Backend error: ${payload.error}`);
const dataJs = `window.__CORTEX_DATA__=${JSON.stringify(payload.data).replace(/<\/script/gi, "<\\/script")};`;
rmSync(cssTmp, { force: true });

mkdirSync("dist", { recursive: true });

for (const t of TARGETS) {
  // 2. JS — one minified IIFE per file
  const result = await build({
    entryPoints: [t.entry],
    bundle: true,
    minify: true,
    write: false,
    format: "iife",
    target: "es2019",
    jsx: "automatic",
    tsconfig: "tsconfig.json",
    define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(API) },
    loader: { ".png": "dataurl" }, // brand images are embedded, so the file works offline
    logLevel: "error", // silences the harmless "use client" directive notices
  });
  // keep the inline script from being closed early by any "</script" in the bundle
  const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

  // 3. Stitch
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Instrument+Serif&display=swap">
<style>:root{--font-plex-sans:"IBM Plex Sans";--font-plex-mono:"IBM Plex Mono";--font-serif:"Instrument Serif"}</style>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${dataJs}</script>
<script>${js}</script>
</body>
</html>
`;
  writeFileSync(t.out, html);
  console.log(`Wrote ${t.out} (${(html.length / 1024).toFixed(0)} KB)`);
}
