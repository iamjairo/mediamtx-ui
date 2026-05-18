import Tab from "./Tab.js";

const REPO_URL = 'https://github.com/iamjairo/Home-Assistant-Dashboard';
const DEFAULT_PORT = 5173;

export default class HomeAssistantTab extends Tab {
    constructor(page) {
        super(page);
        this.url = localStorage.getItem('homeassistant:url') || '';
    }

    async render() {
        this.element = document.createElement("div");
        this.element.className = "tab homeassistant-tab";
        this.page.contentWrapper.append(this.element);

        this.renderHeader();
        this.renderToolbar();
        this.renderBody();
    }

    renderHeader() {
        const header = document.createElement("div");
        header.className = "ha-header";
        header.innerHTML = `
            <div class="ha-header-left">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <div>
                    <h2>Home Assistant Dashboard</h2>
                    <p>Tunet Dashboard — embedded React UI for Home Assistant entity control</p>
                </div>
            </div>
            <div class="ha-header-right">
                <span class="ha-status-pill" data-state="unknown">● Unknown</span>
                <a href="${REPO_URL}" target="_blank" rel="noopener" class="phase2-btn sm secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                    Repo
                </a>
            </div>
        `;
        this.statusPill = header.querySelector('.ha-status-pill');
        this.element.append(header);
    }

    renderToolbar() {
        const bar = document.createElement("div");
        bar.className = "ha-toolbar";
        bar.innerHTML = `
            <label class="ha-toolbar-label">Dashboard URL</label>
            <input type="text" class="ha-url-input" placeholder="http://localhost:${DEFAULT_PORT}" value="${this.escapeHtml(this.url)}" />
            <button class="phase2-btn sm ha-connect-btn">Connect</button>
            <button class="phase2-btn sm secondary ha-open-btn">Open in new tab</button>
            <button class="phase2-btn sm secondary ha-reload-btn">Reload</button>
        `;
        this.urlInput = bar.querySelector('.ha-url-input');
        bar.querySelector('.ha-connect-btn').addEventListener('click', () => this.connect());
        bar.querySelector('.ha-open-btn').addEventListener('click', () => this.openExternal());
        bar.querySelector('.ha-reload-btn').addEventListener('click', () => this.reload());
        this.urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.connect();
        });
        this.element.append(bar);
    }

    renderBody() {
        this.body = document.createElement("div");
        this.body.className = "ha-body";
        this.element.append(this.body);
        if (this.url) this.renderEmbed();
        else this.renderEmpty();
    }

    renderEmpty() {
        this.body.innerHTML = `
            <div class="ha-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" stroke-width="1.3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <h3>No Home Assistant Dashboard connected</h3>
                <p>Tunet Dashboard is a React/Vite app with its own backend that talks to Home Assistant via OAuth. Run it separately and point this tab at its URL to embed the UI.</p>
                <div class="ha-empty-actions">
                    <a href="${REPO_URL}" target="_blank" rel="noopener" class="phase2-btn sm secondary">GitHub</a>
                    <a href="${REPO_URL}/blob/main/SETUP.md" target="_blank" rel="noopener" class="phase2-btn sm secondary">Setup Guide</a>
                    <a href="${REPO_URL}/blob/main/CARD_OPTIONS.md" target="_blank" rel="noopener" class="phase2-btn sm secondary">Card Options</a>
                </div>
                <div class="ha-install-grid">
                    <div class="ha-install-card">
                        <span class="ha-install-label">1. Clone & install</span>
                        <pre class="ha-pre">git clone ${REPO_URL}.git
cd Home-Assistant-Dashboard
npm install</pre>
                    </div>
                    <div class="ha-install-card">
                        <span class="ha-install-label">2. Configure HA OAuth</span>
                        <pre class="ha-pre">cp .env.example .env
# set HA_BASE_URL, HA_CLIENT_ID, HA_CLIENT_SECRET</pre>
                    </div>
                    <div class="ha-install-card">
                        <span class="ha-install-label">3. Run dev (Vite + backend)</span>
                        <pre class="ha-pre">npm run dev:all
# UI:   http://localhost:5173
# API:  http://localhost:3000</pre>
                    </div>
                    <div class="ha-install-card">
                        <span class="ha-install-label">Or Docker</span>
                        <pre class="ha-pre">docker compose up -d
# exposes on host port from compose file</pre>
                    </div>
                </div>
                <div class="ha-arch-note">
                    <strong>Architecture note:</strong> Tunet Dashboard is React/Vite/Tailwind; this dashboard is vanilla JS.
                    They run as <em>separate processes on different ports</em>. Cosmetic restyling to match this dashboard's
                    dark neon theme is planned — for now we embed the dashboard as-is via iframe.
                </div>
            </div>
        `;
    }

    renderEmbed() {
        this.body.innerHTML = `
            <div class="ha-embed-wrap">
                <iframe class="ha-iframe" src="${this.escapeHtml(this.url)}" allow="autoplay; fullscreen; camera; microphone"></iframe>
            </div>
            <div class="ha-embed-help">
                If the dashboard refuses to load, the Tunet backend may set <code>X-Frame-Options</code>. Use
                <strong>Open in new tab</strong> as a fallback.
            </div>
        `;
        const iframe = this.body.querySelector('iframe');
        iframe.addEventListener('load', () => this.setStatus('connected'));
        iframe.addEventListener('error', () => this.setStatus('error'));
        this.probe();
    }

    async probe() {
        if (!this.url) return;
        try {
            await fetch(this.url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' });
            this.setStatus('connected');
        } catch (e) {
            this.setStatus('error');
        }
    }

    setStatus(state) {
        if (!this.statusPill) return;
        this.statusPill.setAttribute('data-state', state);
        const labels = { connected: '● Reachable', error: '● Unreachable', unknown: '● Unknown' };
        this.statusPill.textContent = labels[state] || '● Unknown';
    }

    connect() {
        const value = this.urlInput.value.trim();
        if (!value) {
            this.url = '';
            localStorage.removeItem('homeassistant:url');
            this.renderEmpty();
            this.setStatus('unknown');
            return;
        }
        let normalized = value;
        if (!/^https?:\/\//i.test(normalized)) normalized = 'http://' + normalized;
        this.url = normalized;
        localStorage.setItem('homeassistant:url', normalized);
        this.renderEmbed();
    }

    openExternal() {
        const value = this.urlInput.value.trim() || this.url;
        if (!value) {
            this.page.toast?.error?.('Set the dashboard URL first.');
            return;
        }
        let normalized = value;
        if (!/^https?:\/\//i.test(normalized)) normalized = 'http://' + normalized;
        window.open(normalized, '_blank', 'noopener,noreferrer');
    }

    reload() {
        if (this.url) this.renderEmbed();
    }

    escapeHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    destroy() {
        super.destroy();
    }
}
