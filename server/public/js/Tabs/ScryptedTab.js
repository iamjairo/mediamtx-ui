import Tab from "./Tab.js";

export default class ScryptedTab extends Tab {
    constructor(page) {
        super(page);
        this.url = localStorage.getItem('scrypted:url') || '';
        this.reachable = null;
    }

    async render() {
        this.element = document.createElement("div");
        this.element.className = "tab scrypted-tab";
        this.page.contentWrapper.append(this.element);

        this.renderHeader();
        this.renderToolbar();
        this.renderBody();
    }

    renderHeader() {
        const header = document.createElement("div");
        header.className = "scrypted-header";
        header.innerHTML = `
            <div class="scrypted-header-left">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17l6-6-6-6"/><path d="M12 19h8"/></svg>
                <div>
                    <h2>Scrypted Console</h2>
                    <p>Embed and access your Scrypted home-camera dashboard</p>
                </div>
            </div>
            <div class="scrypted-header-right">
                <span class="scrypted-status-pill" data-state="unknown">● Unknown</span>
            </div>
        `;
        this.statusPill = header.querySelector('.scrypted-status-pill');
        this.element.append(header);
    }

    renderToolbar() {
        const bar = document.createElement("div");
        bar.className = "scrypted-toolbar";
        bar.innerHTML = `
            <label class="scrypted-url-label">Scrypted URL</label>
            <input type="text" class="scrypted-url-input" placeholder="https://192.168.1.50:10443" value="${this.escapeHtml(this.url)}" />
            <button class="phase2-btn sm scrypted-connect-btn">Connect</button>
            <button class="phase2-btn sm secondary scrypted-open-btn">Open in new tab</button>
        `;
        this.urlInput = bar.querySelector('.scrypted-url-input');
        bar.querySelector('.scrypted-connect-btn').addEventListener('click', () => this.connect());
        bar.querySelector('.scrypted-open-btn').addEventListener('click', () => this.openExternal());
        this.urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.connect();
        });
        this.element.append(bar);
    }

    renderBody() {
        this.body = document.createElement("div");
        this.body.className = "scrypted-body";
        this.element.append(this.body);
        if (this.url) this.renderEmbed();
        else this.renderEmpty();
    }

    renderEmpty() {
        this.body.innerHTML = `
            <div class="scrypted-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" stroke-width="1.3"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                <h3>No Scrypted instance connected</h3>
                <p>Scrypted is an open-source home camera/automation hub that can route cameras to HomeKit, Google Home, and Alexa. Set its URL above to embed the console here.</p>
                <div class="scrypted-empty-actions">
                    <a href="https://www.scrypted.app" target="_blank" rel="noopener" class="phase2-btn sm secondary">scrypted.app</a>
                    <a href="https://github.com/koush/scrypted" target="_blank" rel="noopener" class="phase2-btn sm secondary">GitHub</a>
                    <a href="https://docs.scrypted.app/installation.html" target="_blank" rel="noopener" class="phase2-btn sm secondary">Install Guide</a>
                </div>
                <div class="scrypted-install-snippet">
                    <span class="scrypted-snippet-label">Quick install (Docker)</span>
                    <pre class="scrypted-snippet-pre">docker run -d \\
  --name scrypted \\
  --restart unless-stopped \\
  --network host \\
  -v scrypted:/server/volume \\
  ghcr.io/koush/scrypted:latest</pre>
                </div>
            </div>
        `;
    }

    renderEmbed() {
        this.body.innerHTML = `
            <div class="scrypted-embed-wrap">
                <iframe class="scrypted-iframe" src="${this.escapeHtml(this.url)}" allow="camera; microphone; fullscreen; autoplay"></iframe>
            </div>
            <div class="scrypted-embed-help">
                If the dashboard does not load, Scrypted likely blocks iframe embedding (X-Frame-Options).
                Use <strong>Open in new tab</strong> instead.
            </div>
        `;
        const iframe = this.body.querySelector('iframe');
        iframe.addEventListener('load', () => this.setStatus('connected'));
        iframe.addEventListener('error', () => this.setStatus('error'));
        // Best-effort reachability check (will be opaque due to CORS but tells us if host resolves)
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
            localStorage.removeItem('scrypted:url');
            this.renderEmpty();
            this.setStatus('unknown');
            return;
        }
        let normalized = value;
        if (!/^https?:\/\//i.test(normalized)) {
            normalized = 'https://' + normalized;
        }
        this.url = normalized;
        localStorage.setItem('scrypted:url', normalized);
        this.renderEmbed();
    }

    openExternal() {
        const value = this.urlInput.value.trim() || this.url;
        if (!value) {
            this.page.toast?.error?.('Set a Scrypted URL first.');
            return;
        }
        let normalized = value;
        if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;
        window.open(normalized, '_blank', 'noopener,noreferrer');
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
