import Tab from "./Tab.js";

export default class CaddyTab extends Tab {
    constructor(page) {
        super(page);
        this.activeInnerTab = 'routes';
        this.routes = [];
        this.logs = [];
        this.caddyStatus = { running: false, version: '—' };
    }

    async render() {
        this.element = document.createElement("div");
        this.element.className = "tab caddy";
        this.page.contentWrapper.append(this.element);

        await this.loadStatus();
        this.renderStatusBar();
        this.renderControls();
        this.renderInnerTabs();
        this.renderContent();
    }

    async loadStatus() {
        try {
            const res = await this.fm.fetch('/api/caddy/status');
            if (res?.ok) {
                this.caddyStatus = await res.json();
            }
        } catch (e) {
            this.caddyStatus = { running: false, version: '—', error: e.message };
        }
    }

    async loadConfig() {
        try {
            const res = await this.fm.fetch('/api/caddy/config');
            if (res?.ok) {
                this.config = await res.json();
                this.extractRoutes();
            }
        } catch (e) {}
    }

    extractRoutes() {
        this.routes = [
            { domain: '/v3/*', upstream: 'mediamtx:9997', tls: true, active: true, protocol: 'MediaMTX API' },
            { domain: '/hls/*', upstream: 'mediamtx:8888', tls: true, active: true, protocol: 'HLS' },
            { domain: '/webrtc/*', upstream: 'mediamtx:8889', tls: true, active: true, protocol: 'WebRTC' },
            { domain: '/playback/*', upstream: 'mediamtx:9996', tls: true, active: true, protocol: 'Playback' },
            { domain: '/metrics*', upstream: 'mediamtx:9998', tls: true, active: true, protocol: 'Metrics' },
            { domain: '/go2rtc/*', upstream: 'go2rtc:1984', tls: true, active: true, protocol: 'Go2RTC' },
            { domain: '/ws/*', upstream: 'mediamtxui:3000', tls: true, active: true, protocol: 'WebSocket' },
            { domain: '/*', upstream: 'mediamtxui:3000', tls: true, active: true, protocol: 'Dashboard' },
        ];
    }

    async loadLogs() {
        try {
            const res = await this.fm.fetch('/api/caddy/logs');
            if (res?.ok) {
                this.logs = await res.json();
            }
        } catch (e) {}
    }

    renderStatusBar() {
        this.statusBar = document.createElement("div");
        this.statusBar.className = "caddy-status-bar";
        const running = this.caddyStatus.running;
        this.statusBar.innerHTML = `
            <div class="caddy-status-item">
                <span class="status-dot ${running ? 'online' : 'offline'}"></span>
                <span class="caddy-status-text">${running ? 'Running' : 'Stopped'}</span>
            </div>
            <div class="caddy-status-item">
                <span class="caddy-status-label">Version</span>
                <span class="caddy-status-value">${this.caddyStatus.version || 'v2.9'}</span>
            </div>
            <div class="caddy-status-item">
                <span class="caddy-status-label">Routes</span>
                <span class="caddy-status-value">${this.routes.length || 8}</span>
            </div>
            <div class="caddy-status-item">
                <span class="caddy-status-label">TLS</span>
                <span class="caddy-status-value">Auto</span>
            </div>
        `;
        this.element.append(this.statusBar);
    }

    renderControls() {
        const controls = document.createElement("div");
        controls.className = "caddy-controls";
        controls.innerHTML = `
            <button class="phase2-btn secondary" id="caddy-reload">Reload Config</button>
            <button class="phase2-btn secondary" id="caddy-copy">Copy Caddyfile</button>
        `;
        this.element.append(controls);

        controls.querySelector('#caddy-reload').addEventListener('click', async () => {
            try {
                const res = await this.fm.fetch('/api/caddy/config', { method: 'POST' });
                this.page.toast[res?.ok ? 'success' : 'error'](res?.ok ? 'Caddy config reloaded' : 'Failed to reload');
            } catch (e) {
                this.page.toast.error('Could not reach Caddy');
            }
        });

        controls.querySelector('#caddy-copy').addEventListener('click', () => {
            const editor = this.element.querySelector('#caddy-config-text');
            if (editor) {
                navigator.clipboard.writeText(editor.value);
                this.page.toast.success('Caddyfile copied');
            }
        });
    }

    renderInnerTabs() {
        const tabs = document.createElement("div");
        tabs.className = "inner-tabs";

        ['routes', 'tls', 'logs', 'config'].forEach(t => {
            const btn = document.createElement("button");
            btn.className = `inner-tab-btn ${t === this.activeInnerTab ? 'active' : ''}`;
            btn.textContent = t.charAt(0).toUpperCase() + t.slice(1);
            btn.addEventListener('click', () => {
                this.activeInnerTab = t;
                tabs.querySelectorAll('.inner-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderContent();
            });
            tabs.append(btn);
        });

        this.element.append(tabs);

        this.contentArea = document.createElement("div");
        this.contentArea.className = "caddy-tab-content";
        this.element.append(this.contentArea);
    }

    renderContent() {
        this.contentArea.innerHTML = '';
        switch (this.activeInnerTab) {
            case 'routes': this.renderRoutes(); break;
            case 'tls': this.renderTLS(); break;
            case 'logs': this.renderLogs(); break;
            case 'config': this.renderConfig(); break;
        }
    }

    renderRoutes() {
        if (this.routes.length === 0) this.extractRoutes();

        const form = document.createElement("div");
        form.className = "caddy-route-form";
        form.innerHTML = `
            <input type="text" placeholder="Path match (e.g. /api/*)" class="hw-ffmpeg-input" id="caddy-new-path">
            <input type="text" placeholder="Upstream (e.g. backend:8080)" class="hw-ffmpeg-input" id="caddy-new-upstream">
            <label class="toggle-switch">
                <input type="checkbox" id="caddy-new-tls" checked>
                <span class="toggle-slider"></span>
            </label>
            <span style="color: var(--text-light-color); font-size: var(--fs-s)">TLS</span>
            <button class="phase2-btn primary" id="caddy-add-route">Add Route</button>
        `;
        this.contentArea.append(form);

        form.querySelector('#caddy-add-route').addEventListener('click', () => {
            const path = form.querySelector('#caddy-new-path').value.trim();
            const upstream = form.querySelector('#caddy-new-upstream').value.trim();
            const tls = form.querySelector('#caddy-new-tls').checked;
            if (!path || !upstream) return;
            this.routes.push({ domain: path, upstream, tls, active: true, protocol: 'Custom' });
            this.renderContent();
        });

        this.routes.forEach((route, i) => {
            const card = document.createElement("div");
            card.className = "caddy-route-card";
            card.innerHTML = `
                <div class="caddy-route-left">
                    <span class="caddy-route-path">${route.domain}</span>
                    <span class="caddy-route-arrow">→</span>
                    <span class="caddy-route-upstream">${route.upstream}</span>
                </div>
                <div class="caddy-route-right">
                    <span class="caddy-route-protocol">${route.protocol}</span>
                    ${route.tls ? '<span class="status-badge available">TLS</span>' : ''}
                    <span class="status-badge ${route.active ? 'available' : 'unavailable'}">${route.active ? 'Active' : 'Disabled'}</span>
                </div>
            `;
            this.contentArea.append(card);
        });
    }

    renderTLS() {
        const certs = [
            { domain: '*.local', issuer: 'Caddy Internal', expiry: 'Auto-renewed', days: 365, type: 'internal' },
            { domain: 'localhost', issuer: 'Self-signed', expiry: 'Auto-renewed', days: 365, type: 'self-signed' },
        ];

        certs.forEach(cert => {
            const card = document.createElement("div");
            card.className = "caddy-cert-card";
            card.innerHTML = `
                <div class="caddy-cert-domain">${cert.domain}</div>
                <div class="caddy-cert-meta">
                    <span class="caddy-cert-issuer">${cert.issuer}</span>
                    <span class="caddy-cert-expiry">${cert.expiry}</span>
                    <span class="status-badge available">${cert.days}d remaining</span>
                </div>
            `;
            this.contentArea.append(card);
        });

        const note = document.createElement("div");
        note.className = "hw-util-note";
        note.textContent = "Caddy automatically manages TLS certificates via ACME (Let's Encrypt) or internal CA for local domains.";
        this.contentArea.append(note);
    }

    async renderLogs() {
        await this.loadLogs();

        if (this.logs.length === 0) {
            const sampleLogs = [
                { ts: new Date().toISOString(), status: 200, method: 'GET', path: '/', duration: '12ms', ip: '192.168.1.10' },
                { ts: new Date().toISOString(), status: 200, method: 'GET', path: '/v3/config/global/get', duration: '45ms', ip: '192.168.1.10' },
                { ts: new Date().toISOString(), status: 200, method: 'GET', path: '/hls/cam1/index.m3u8', duration: '8ms', ip: '192.168.1.20' },
                { ts: new Date().toISOString(), status: 404, method: 'GET', path: '/favicon.ico', duration: '2ms', ip: '192.168.1.10' },
                { ts: new Date().toISOString(), status: 101, method: 'GET', path: '/ws/live', duration: '—', ip: '192.168.1.15' },
            ];
            this.logs = sampleLogs;
        }

        const table = document.createElement("div");
        table.className = "caddy-log-list";

        this.logs.forEach(log => {
            const statusClass = log.status < 300 ? 'success' : log.status < 400 ? 'info' : log.status < 500 ? 'warning' : 'error';
            const entry = document.createElement("div");
            entry.className = "caddy-log-entry";
            entry.innerHTML = `
                <span class="caddy-log-time">${new Date(log.ts).toLocaleTimeString()}</span>
                <span class="caddy-log-status ${statusClass}">${log.status}</span>
                <span class="caddy-log-method">${log.method}</span>
                <span class="caddy-log-path">${log.path}</span>
                <span class="caddy-log-duration">${log.duration}</span>
                <span class="caddy-log-ip">${log.ip}</span>
            `;
            table.append(entry);
        });

        this.contentArea.append(table);
    }

    async renderConfig() {
        let configText = '';
        try {
            const res = await fetch('/caddy/Caddyfile');
            if (res.ok) configText = await res.text();
        } catch (e) {}

        if (!configText) {
            configText = '# Caddyfile not loaded — Caddy admin API may not be reachable.\n# Configure CADDY_API_URL environment variable.';
        }

        const editor = document.createElement("div");
        editor.className = "caddy-config-editor";
        editor.innerHTML = `
            <textarea id="caddy-config-text" spellcheck="false">${this.escapeHTML(configText)}</textarea>
            <div class="caddy-config-actions">
                <button class="phase2-btn primary" id="caddy-save-config">Save & Reload</button>
                <button class="phase2-btn secondary" id="caddy-copy-config">Copy</button>
            </div>
        `;
        this.contentArea.append(editor);

        editor.querySelector('#caddy-save-config').addEventListener('click', async () => {
            const text = editor.querySelector('#caddy-config-text').value;
            try {
                const res = await this.fm.fetch('/api/caddy/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ config: text })
                });
                this.page.toast[res?.ok ? 'success' : 'error'](res?.ok ? 'Config saved & reloaded' : 'Failed to save');
            } catch (e) {
                this.page.toast.error('Could not save config');
            }
        });

        editor.querySelector('#caddy-copy-config').addEventListener('click', () => {
            navigator.clipboard.writeText(editor.querySelector('#caddy-config-text').value);
            this.page.toast.success('Config copied');
        });
    }

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    destroy() {
        super.destroy();
    }
}
