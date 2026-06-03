import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { type Server } from "node:http";

import { nanoid } from "nanoid";
import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";

import viteConfig from "../vite.config";
import runApp from "./app";

function openBrowser(url: string) {
  if (process.env.NO_OPEN === "1") return;
  const cmd =
    process.platform === "win32"
      ? { bin: "cmd", args: ["/c", "start", "", url] }
      : process.platform === "darwin"
        ? { bin: "open", args: [url] }
        : { bin: "xdg-open", args: [url] };
  try {
    const child = spawn(cmd.bin, cmd.args, {
      detached: true,
      stdio: "ignore",
      shell: false,
    });
    child.unref();
  } catch {
    /* ignore */
  }
}

export async function setupVite(app: Express, server: Server) {
  const viteLogger = createLogger();
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

(async () => {
  const server = await runApp(setupVite);

  const printBanner = () => {
    const addr = server.address();
    const port =
      typeof addr === "object" && addr ? addr.port : process.env.PORT || 5000;
    const host = "localhost";
    const url = `http://${host}:${port}`;
    const label = `  \u279C  ${url}  `;
    const OSC = "\x1b]8;;";
    const ST = "\x1b\\";
    const hyperlink = `${OSC}${url}${ST}${label}${OSC}${ST}`;
    const line = "\x1b[2m\u2500".repeat(48) + "\x1b[0m";
    console.log("");
    console.log("\x1b[32m\xe2\x9c\x93\x1b[0m  Dev server ready");
    console.log(line);
    console.log("  Local:   " + hyperlink);
    console.log("  Network: " + `${OSC}http://${addr && typeof addr === "object" ? `0.0.0.0:${port}` : url}${ST}  http://0.0.0.0:${port}  ${OSC}${ST}`);
    console.log(line);
    console.log("  Press \x1b[1mCtrl+C\x1b[0m to stop  \xe2\x80\xa2  Set \x1b[1mNO_OPEN=1\x1b[0m to skip auto-open");
    console.log("");
    openBrowser(url);
  };

  if (server.listening) {
    printBanner();
  } else {
    server.once("listening", printBanner);
  }
})();
