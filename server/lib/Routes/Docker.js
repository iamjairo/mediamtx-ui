import express from "express";
import http from "http";

const DOCKER_SOCKET = "/var/run/docker.sock";

const MOCK_CONTAINERS = [
    {
        Id: "mock-mediamtx-container-id",
        Names: ["/mediamtx"],
        Image: "bluenviron/mediamtx:latest",
        Status: "Up 2 hours",
        State: "running",
        Ports: [{ PrivatePort: 8554, PublicPort: 8554, Type: "tcp" }],
        Created: Math.floor(Date.now() / 1000) - 7200
    },
    {
        Id: "mock-mediamtxui-container-id",
        Names: ["/mediamtxui"],
        Image: "mediamtx-ui:latest",
        Status: "Up 2 hours",
        State: "running",
        Ports: [{ PrivatePort: 3000, PublicPort: 3000, Type: "tcp" }],
        Created: Math.floor(Date.now() / 1000) - 7200
    },
    {
        Id: "mock-caddy-container-id",
        Names: ["/caddy"],
        Image: "caddy:latest",
        Status: "Up 2 hours",
        State: "running",
        Ports: [
            { PrivatePort: 80, PublicPort: 80, Type: "tcp" },
            { PrivatePort: 443, PublicPort: 443, Type: "tcp" },
            { PrivatePort: 2019, PublicPort: 2019, Type: "tcp" }
        ],
        Created: Math.floor(Date.now() / 1000) - 7200
    },
    {
        Id: "mock-go2rtc-container-id",
        Names: ["/go2rtc"],
        Image: "alexxit/go2rtc:latest",
        Status: "Up 2 hours",
        State: "running",
        Ports: [
            { PrivatePort: 1984, PublicPort: 1984, Type: "tcp" },
            { PrivatePort: 8555, PublicPort: 8555, Type: "tcp" }
        ],
        Created: Math.floor(Date.now() / 1000) - 7200
    }
];

/**
 * Make an HTTP request to the Docker Unix socket.
 * Returns { status, body } where body is parsed JSON (or raw text on failure).
 */
function dockerRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            socketPath: DOCKER_SOCKET,
            path,
            method,
            headers: { "Content-Type": "application/json" }
        };

        const req = http.request(options, (res) => {
            let raw = "";
            res.on("data", chunk => { raw += chunk; });
            res.on("end", () => {
                let parsed;
                try { parsed = JSON.parse(raw); } catch (_) { parsed = raw; }
                resolve({ status: res.statusCode, body: parsed });
            });
        });

        req.on("error", reject);

        if (body !== null) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

/**
 * Check whether the Docker socket is accessible.
 */
async function socketAvailable() {
    try {
        await dockerRequest("GET", "/_ping");
        return true;
    } catch (_) {
        return false;
    }
}

export default class DockerRoutes {
    constructor(routes) {
        this.routes = routes;
        this.server = this.routes.server;

        this.router = express.Router();
        this.router.use(express.json({ limit: "10mb" }));

        // GET /docker/containers — list all containers
        this.router.get("/docker/containers", async (req, res) => {
            try {
                if (!(await socketAvailable())) {
                    return res.status(200).json({ mock: true, containers: MOCK_CONTAINERS });
                }
                const { status, body } = await dockerRequest("GET", "/containers/json?all=true");
                return res.status(status).json(body);
            } catch (e) {
                return res.status(502).json({
                    error: "docker_unavailable",
                    message: `Could not reach Docker Engine API: ${e.message}`
                });
            }
        });

        // GET /docker/containers/:id — inspect a container
        this.router.get("/docker/containers/:id", async (req, res) => {
            const { id } = req.params;
            try {
                if (!(await socketAvailable())) {
                    const mock = MOCK_CONTAINERS.find(c => c.Id === id || c.Names.includes(`/${id}`));
                    if (!mock) return res.status(404).json({ error: "not_found", message: `Container ${id} not found` });
                    return res.status(200).json({ mock: true, container: mock });
                }
                const { status, body } = await dockerRequest("GET", `/containers/${encodeURIComponent(id)}/json`);
                return res.status(status).json(body);
            } catch (e) {
                return res.status(502).json({
                    error: "docker_unavailable",
                    message: `Could not reach Docker Engine API: ${e.message}`
                });
            }
        });

        // POST /docker/containers/:id/start — start a container
        this.router.post("/docker/containers/:id/start", async (req, res) => {
            const { id } = req.params;
            try {
                if (!(await socketAvailable())) {
                    return res.status(200).json({ mock: true, message: `Mock: container ${id} started` });
                }
                const { status, body } = await dockerRequest("POST", `/containers/${encodeURIComponent(id)}/start`);
                return res.status(status).json(body ?? { message: "started" });
            } catch (e) {
                return res.status(502).json({
                    error: "docker_unavailable",
                    message: `Could not reach Docker Engine API: ${e.message}`
                });
            }
        });

        // POST /docker/containers/:id/stop — stop a container
        this.router.post("/docker/containers/:id/stop", async (req, res) => {
            const { id } = req.params;
            try {
                if (!(await socketAvailable())) {
                    return res.status(200).json({ mock: true, message: `Mock: container ${id} stopped` });
                }
                const { status, body } = await dockerRequest("POST", `/containers/${encodeURIComponent(id)}/stop`);
                return res.status(status).json(body ?? { message: "stopped" });
            } catch (e) {
                return res.status(502).json({
                    error: "docker_unavailable",
                    message: `Could not reach Docker Engine API: ${e.message}`
                });
            }
        });

        // POST /docker/containers/:id/restart — restart a container
        this.router.post("/docker/containers/:id/restart", async (req, res) => {
            const { id } = req.params;
            try {
                if (!(await socketAvailable())) {
                    return res.status(200).json({ mock: true, message: `Mock: container ${id} restarted` });
                }
                const { status, body } = await dockerRequest("POST", `/containers/${encodeURIComponent(id)}/restart`);
                return res.status(status).json(body ?? { message: "restarted" });
            } catch (e) {
                return res.status(502).json({
                    error: "docker_unavailable",
                    message: `Could not reach Docker Engine API: ${e.message}`
                });
            }
        });

        // GET /docker/containers/:id/logs — last 100 lines with timestamps
        this.router.get("/docker/containers/:id/logs", async (req, res) => {
            const { id } = req.params;
            try {
                if (!(await socketAvailable())) {
                    return res.status(200).json({
                        mock: true,
                        logs: [`[mock] No Docker socket available — logs unavailable for container ${id}`]
                    });
                }
                const { status, body } = await dockerRequest(
                    "GET",
                    `/containers/${encodeURIComponent(id)}/logs?stdout=true&stderr=true&timestamps=true&tail=100`
                );
                // Docker log output is a raw multiplexed stream; split on newlines and clean up control chars
                const lines = typeof body === "string"
                    ? body.split("\n").filter(Boolean).map(l => l.replace(/^[\x00-\x09\x0b-\x1f]{1,8}/, "").trim())
                    : [JSON.stringify(body)];
                return res.status(status).json({ logs: lines });
            } catch (e) {
                return res.status(502).json({
                    error: "docker_unavailable",
                    message: `Could not reach Docker Engine API: ${e.message}`
                });
            }
        });

        // GET /docker/info — Docker system info
        this.router.get("/docker/info", async (req, res) => {
            try {
                if (!(await socketAvailable())) {
                    return res.status(200).json({
                        mock: true,
                        info: {
                            ServerVersion: "mock",
                            Containers: MOCK_CONTAINERS.length,
                            ContainersRunning: MOCK_CONTAINERS.filter(c => c.State === "running").length,
                            ContainersPaused: 0,
                            ContainersStopped: 0,
                            OperatingSystem: "mock",
                            Architecture: "mock"
                        }
                    });
                }
                const { status, body } = await dockerRequest("GET", "/info");
                return res.status(status).json(body);
            } catch (e) {
                return res.status(502).json({
                    error: "docker_unavailable",
                    message: `Could not reach Docker Engine API: ${e.message}`
                });
            }
        });
    }
}
