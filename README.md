# MediaMTX Dashboard

> A modern, dark-themed web dashboard for [MediaMTX](https://mediamtx.org/) stream management.

Built for Linux x86 Docker deployments. Configure streams, users, server settings, and monitor your entire MediaMTX infrastructure from a single interface.

## Features

- Real-time stream overview with live video previews (HLS/WebRTC)
- Full server configuration at runtime (all properties)
- Path/stream management: add, edit, delete with live reload
- User management with Argon2 authentication
- Dark, rich UI with sidebar navigation and glassmorphism design
- Responsive layout for desktop and tablet

## Architecture

```
docker-compose-all.yml
├── caddy          (reverse proxy, TLS termination)
├── mediamtxui     (Node.js dashboard on port 3000)
└── mediamtx       (streaming server: RTSP/RTMP/HLS/WebRTC)
```

## Quick Start

```bash
# 1. Clone and setup
git clone https://github.com/iamjairo/mediamtx-ui.git
cd mediamtx-ui
bash setup.sh

# 2. Edit configuration
nano .env
nano config/mediamtx.yml

# 3. Choose a deployment
```

### Deployment Options

| Command | Description |
|---------|-------------|
| `docker compose -f docker-compose-all.yml up -d` | All-in-one: Dashboard + MediaMTX + Caddy |
| `docker compose up -d` | Dashboard only (development) |
| `docker compose -f docker-compose-mediamtx.yml up -d` | MediaMTX server only |
| `docker compose -f docker-compose-hwaccel.yml up -d` | Hardware accelerated (VAAPI/QSV) |

### Desktop App

```bash
# Electron
cd desktop/electron && npm install && npm start

# Tauri
cd desktop/tauri && cargo tauri dev
```

## Docker Services

### Dashboard (`mediamtxui`)
- **Port**: 3000
- **Stack**: Node.js 22, Express 5, Vanilla JS frontend
- **Auth**: Argon2 password hashing, session-based

### MediaMTX (`mediamtx`)
- **Ports**: 8554 (RTSP), 1935 (RTMP), 8888 (HLS), 8889 (WebRTC), 8189/udp (ICE)
- **Config**: `config/mediamtx.yml`

### Caddy (`caddy`)
- **Ports**: 80/443
- **Config**: `caddy/Caddyfile`
- Automatic HTTPS, reverse proxy to dashboard and streams

## Configuration

### Environment Variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT_NAME` | `mediamtxui` | Docker container name |
| `MEDIAMTX_VERSION` | `latest-ffmpeg` | MediaMTX Docker image tag |
| `SERVER_PORT` | `3000` | Dashboard port |
| `HW_ACCEL` | `none` | Hardware acceleration: `vaapi`, `qsv`, `cuda`, `none` |
| `DOMAIN` | `localhost` | Caddy domain for HTTPS |
| `RECORDING_PATH` | `./recordings` | Recording storage path |

### Authentication

Generate password hashes:
```bash
docker exec -it mediamtxui node generate_auth.js
```

## Modules (Planned)

- **WebRTC**: Direct browser-to-browser streaming configuration
- **Recordings**: Recording management and playback
- **Hardware Acceleration**: GPU transcoding status and configuration
- **Docker**: Container management from the dashboard

## Development

```bash
docker compose build
docker compose up -d
docker exec -it mediamtxui bash

# Inside container:
node watch_css.js    # CSS hot reload
node index.js        # Start server
```

## License

ISC
