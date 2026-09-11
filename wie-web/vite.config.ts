import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const crateDir = import.meta.dirname;
const rustDir = path.join(crateDir, "src/rust");
const cargoToml = path.join(crateDir, "Cargo.toml");

/**
 * Compiles the emulator crate to wasm before Vite resolves `@pkg`, and rebuilds
 * it when Rust sources change during `vite dev`.
 */
const wasmPack = (): Plugin => {
  let building: Promise<void> | undefined;
  let dev = true;

  const build = (devProfile: boolean) => {
    // cargo lives next to wasm-pack and rustup does not put it on PATH by default.
    const cargoBin = path.join(os.homedir(), ".cargo", "bin");
    const env = { ...process.env, PATH: `${cargoBin}${path.delimiter}${process.env.PATH ?? ""}` };
    const exeName = process.platform === "win32" ? "wasm-pack.exe" : "wasm-pack";
    const installed = path.join(cargoBin, exeName);
    // Resolving the binary avoids spawning through a shell, which Node deprecated for args.
    const command = fs.existsSync(installed) ? installed : exeName;
    // --no-pack skips generating pkg/package.json. We import pkg/wie_web.js by
    // path and never publish the package, and wasm-pack fails to write that
    // manifest for a crate whose `repository` is inherited from the workspace.
    const args = ["build", crateDir, "--target", "web", "--no-pack", devProfile ? "--dev" : "--release"];

    return new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, { stdio: "inherit", env });
      child.on("exit", code => (code === 0 ? resolve() : reject(new Error(`wasm-pack exited with code ${code}`))));
      child.on("error", reject);
    });
  };

  return {
    name: "wasm-pack",
    // The dev cargo profile only raises opt-level for the ARM core, so the JVM
    // and all the LCDUI drawing stay unoptimized and games crawl. Serve the
    // release emulator even from the dev server; set WIE_WASM_DEV=1 to trade
    // that back for fast Rust rebuilds while working on the emulator itself.
    //
    // vite build forces NODE_ENV=production, so read the mode Vite was given
    // rather than NODE_ENV - otherwise `build:dev` could never opt out.
    config(_config, env) {
      const requested = process.env.WIE_WASM_DEV;
      dev = requested === undefined ? env.command === "build" && env.mode !== "production" : requested === "1";
    },
    buildStart() {
      building ??= build(dev);
      return building;
    },
    configureServer(server) {
      server.watcher.add([rustDir, cargoToml]);
      server.watcher.on("change", async file => {
        if (file !== cargoToml && !file.startsWith(rustDir + path.sep)) {
          return;
        }

        try {
          await build(true);
          server.ws.send({ type: "full-reload" });
        } catch (error) {
          server.config.logger.error(`wasm rebuild failed: ${String(error)}`);
        }
      });
    },
  };
};

export default defineConfig({
  root: crateDir,
  plugins: [
    react(),
    wasmPack(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png", "GeneralUser.sf3"],
      manifest: {
        name: "wie - 피처폰 앱 에뮬레이터",
        short_name: "wie",
        description: "옛 피처폰의 WIPI/J2ME 게임을 브라우저에서 실행합니다.",
        lang: "ko",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#f8fafc",
        theme_color: "#f8fafc",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // The emulator wasm and the soundfont are tens of megabytes. Keeping
        // them out of the precache makes installing cheap; CacheFirst below
        // still makes the app fully offline once it has run one game.
        globPatterns: ["**/*.{html,js,css,ttf,png,svg,webmanifest}"],
        globIgnores: ["**/GeneralUser.sf3"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith(".wasm"),
            handler: "CacheFirst",
            options: { cacheName: "wie-wasm", expiration: { maxEntries: 2 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: ({ url }) => url.pathname.endsWith(".sf3"),
            handler: "CacheFirst",
            options: { cacheName: "wie-soundfont", expiration: { maxEntries: 2 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@pkg": path.join(crateDir, "pkg/wie_web.js"),
      // The wasm glue imports "midi.ts" as a bare specifier. It must resolve to
      // the same module instance the app imports, or volume state would split.
      "midi.ts": path.join(crateDir, "src/web/lib/midi.ts"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
  // host: true binds every interface instead of just localhost, so a phone on
  // the same network can reach the emulator. Drop it to keep the server local.
  // strictPort so a busy port fails loudly instead of silently moving to the
  // next one, which makes the address printed at startup always the right one.
  server: {
    host: true,
    port: 1140,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 1140,
    strictPort: true,
  },
});
