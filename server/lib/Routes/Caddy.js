import express from "express";
import fs from "fs/promises";

export default class CaddyRoutes {
    constructor(routes, options = {}) {
        this.routes = routes;
        this.server = this.routes.server;

        this.baseUrl = options.caddyApiUrl
            || process.env.CADDY_API_URL
            || "http://caddy:2019";

        this.router = express.Router();
        this.router.use(express.json({ limit: "10mb" }));

        // GET /caddy/config — proxy to Caddy's GET /config/
        this.router.get("/caddy/config", async (req, res) => {
            try {
                const response = await fetch(`${this.baseUrl}/config/`);
                const data = await response.json();
                return res.status(response.status).json(data);
            } catch (e) {
                return res.status(502).json({
                    error: "caddy_unreachable",
                    message: `Could not reach Caddy admin API: ${e.message}`
                });
            }
        });

        // POST /caddy/config — proxy to Caddy's POST /load (reload full config)
        this.router.post("/caddy/config", async (req, res) => {
            try {
                const response = await fetch(`${this.baseUrl}/load`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(req.body)
                });
                const text = await response.text();
                const data = text ? JSON.parse(text) : {};
                return res.status(response.status).json(data);
            } catch (e) {
                return res.status(502).json({
                    error: "caddy_unreachable",
                    message: `Could not reach Caddy admin API: ${e.message}`
                });
            }
        });

        // GET /caddy/config/apps/http/servers — list reverse proxy routes
        this.router.get("/caddy/config/apps/http/servers", async (req, res) => {
            try {
                const response = await fetch(`${this.baseUrl}/config/apps/http/servers`);
                const data = await response.json();
                return res.status(response.status).json(data);
            } catch (e) {
                return res.status(502).json({
                    error: "caddy_unreachable",
                    message: `Could not reach Caddy admin API: ${e.message}`
                });
            }
        });

        // GET /caddy/status — return running status and version info
        this.router.get("/caddy/status", async (req, res) => {
            try {
                const response = await fetch(`${this.baseUrl}/config/`);
                if (!response.ok) {
                    return res.status(200).json({ running: false, version: null });
                }

                // Try to get version from /reverse-proxy/upstreams (best-effort)
                let version = null;
                try {
                    const vRes = await fetch(`${this.baseUrl}/reverse-proxy/upstreams`);
                    if (vRes.ok) {
                        const vData = await vRes.json();
                        version = vData?.caddy_version ?? null;
                    }
                } catch (_) {
                    // version is optional — ignore errors
                }

                return res.status(200).json({ running: true, version });
            } catch (e) {
                return res.status(200).json({
                    running: false,
                    version: null,
                    error: e.message
                });
            }
        });

        // GET /caddy/logs — return recent access log lines
        this.router.get("/caddy/logs", async (req, res) => {
            const logPath = "/var/log/caddy/access.log";
            try {
                const content = await fs.readFile(logPath, "utf8");
                const lines = content
                    .split("\n")
                    .filter(Boolean)
                    .slice(-200)
                    .map(line => {
                        try { return JSON.parse(line); } catch (_) { return line; }
                    });
                return res.status(200).json({ logs: lines });
            } catch (e) {
                if (e.code === "ENOENT") {
                    return res.status(200).json({ logs: [] });
                }
                return res.status(502).json({
                    error: "log_read_failed",
                    message: `Could not read Caddy access log: ${e.message}`
                });
            }
        });
    }
}
