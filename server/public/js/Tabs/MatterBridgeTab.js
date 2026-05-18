import Tab from "./Tab.js";

const REPO_URL = 'https://github.com/iamjairo/matter-onvif-bridge';

export default class MatterBridgeTab extends Tab {
    constructor(page) {
        super(page);
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            return JSON.parse(localStorage.getItem('matterbridge:config') || '{}');
        } catch { return {}; }
    }

    saveConfig() {
        localStorage.setItem('matterbridge:config', JSON.stringify(this.config));
    }

    async render() {
        this.element = document.createElement("div");
        this.element.className = "tab matter-bridge-tab";
        this.page.contentWrapper.append(this.element);

        this.renderHeader();
        this.renderStatusCard();
        this.renderConfigCard();
        this.renderCommissioningCard();
        this.renderQuickStartCard();
    }

    renderHeader() {
        const header = document.createElement("div");
        header.className = "mbridge-header";
        header.innerHTML = `
            <div class="mbridge-header-left">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-4 4 4 4M15 4l4 4-4 4"/><path d="m18 9-12 6"/></svg>
                <div>
                    <h2>Matter Bridge</h2>
                    <p>matter-onvif-bridge — expose ONVIF cameras as native Matter 1.5 devices for Google Home & Apple Home</p>
                </div>
            </div>
            <div class="mbridge-header-right">
                <a href="${REPO_URL}" target="_blank" rel="noopener" class="phase2-btn sm secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                    GitHub
                </a>
            </div>
        `;
        this.element.append(header);
    }

    renderStatusCard() {
        const card = document.createElement("section");
        card.className = "mbridge-card";
        card.innerHTML = `
            <h3>Runtime Status</h3>
            <div class="mbridge-status-grid">
                <div class="mbridge-stat">
                    <span class="mbridge-stat-label">Bridge Process</span>
                    <span class="mbridge-stat-value" data-key="process">
                        <span class="mbridge-dot off"></span>
                        Not connected to dashboard
                    </span>
                </div>
                <div class="mbridge-stat">
                    <span class="mbridge-stat-label">Matter Port (5540/UDP)</span>
                    <span class="mbridge-stat-value" data-key="matter-port">
                        <span class="mbridge-dot unknown"></span>
                        Unknown — checked from bridge host
                    </span>
                </div>
                <div class="mbridge-stat">
                    <span class="mbridge-stat-label">ONVIF Discovery (3702/UDP)</span>
                    <span class="mbridge-stat-value" data-key="onvif-port">
                        <span class="mbridge-dot unknown"></span>
                        Multicast — runs on bridge host
                    </span>
                </div>
                <div class="mbridge-stat">
                    <span class="mbridge-stat-label">Media Server</span>
                    <span class="mbridge-stat-value" data-key="media">
                        <span class="mbridge-dot on"></span>
                        MediaMTX (this dashboard)
                    </span>
                </div>
            </div>
            <p class="mbridge-note">
                The bridge runs as a separate Rust binary on a host with IPv6 + LAN multicast (typically not Docker on macOS).
                Live status would require the bridge to expose an HTTP API — see the
                <a href="${REPO_URL}#roadmap" target="_blank" rel="noopener">roadmap</a> for tracking.
            </p>
        `;
        this.element.append(card);
    }

    renderConfigCard() {
        const card = document.createElement("section");
        card.className = "mbridge-card";
        card.innerHTML = `
            <h3>Configuration</h3>
            <p class="mbridge-card-desc">
                These values are saved locally and used to generate a working <code>.env</code> file.
                They are not sent to the bridge automatically.
            </p>
            <div class="mbridge-form">
                ${this.renderField('onvifUser', 'ONVIF Username', 'admin', this.config.onvifUser || 'admin')}
                ${this.renderField('onvifPass', 'ONVIF Password', '••••••••', this.config.onvifPass || '', 'password')}
                ${this.renderField('discoveryMode', 'Discovery Mode', 'auto', this.config.discoveryMode || 'auto', 'select', ['auto', 'static'])}
                ${this.renderField('staticCameras', 'Static Cameras (host:port,…)', '192.168.1.10:2020', this.config.staticCameras || '')}
                ${this.renderField('cameraNames', 'Friendly Names (serial=name,…)', 'ABC123=Front Door', this.config.cameraNames || '')}
                ${this.renderField('mediaServer', 'Media Server', 'mediamtx', this.config.mediaServer || 'mediamtx', 'select', ['mediamtx', 'go2rtc'])}
                ${this.renderField('mediaHost', 'Media Server Host', 'localhost', this.config.mediaHost || 'localhost')}
                ${this.renderField('mediaPort', 'Media Server API Port', '9997', this.config.mediaPort || '9997')}
            </div>
            <div class="mbridge-form-actions">
                <button class="phase2-btn sm mbridge-save-btn">Save</button>
                <button class="phase2-btn sm secondary mbridge-export-btn">Export .env</button>
            </div>
            <div class="mbridge-env-output" style="display:none">
                <span class="mbridge-card-label">Generated .env</span>
                <pre class="mbridge-pre"></pre>
                <button class="phase2-btn sm secondary mbridge-copy-env-btn">Copy</button>
            </div>
        `;

        card.querySelectorAll('[data-field]').forEach(el => {
            el.addEventListener('input', () => {
                this.config[el.dataset.field] = el.value;
            });
        });

        card.querySelector('.mbridge-save-btn').addEventListener('click', () => {
            this.saveConfig();
            this.page.toast?.success?.('Bridge configuration saved.');
        });

        card.querySelector('.mbridge-export-btn').addEventListener('click', () => {
            const env = this.buildEnv();
            const out = card.querySelector('.mbridge-env-output');
            const pre = card.querySelector('.mbridge-pre');
            pre.textContent = env;
            out.style.display = 'flex';
        });

        card.querySelector('.mbridge-copy-env-btn').addEventListener('click', (e) => {
            const env = card.querySelector('.mbridge-pre').textContent;
            navigator.clipboard.writeText(env).then(() => {
                e.target.textContent = 'Copied!';
                setTimeout(() => { e.target.textContent = 'Copy'; }, 1500);
            });
        });

        this.element.append(card);
    }

    renderField(key, label, placeholder, value, type = 'text', options) {
        if (type === 'select') {
            return `
                <div class="mbridge-field">
                    <label>${this.escapeHtml(label)}</label>
                    <select data-field="${key}">
                        ${options.map(o => `<option value="${o}" ${o === value ? 'selected' : ''}>${o}</option>`).join('')}
                    </select>
                </div>
            `;
        }
        return `
            <div class="mbridge-field">
                <label>${this.escapeHtml(label)}</label>
                <input type="${type}" data-field="${key}" placeholder="${this.escapeHtml(placeholder)}" value="${this.escapeHtml(value)}" autocomplete="off" />
            </div>
        `;
    }

    buildEnv() {
        const c = this.config;
        const lines = [
            '# Generated by MediaMTX Dashboard',
            `ONVIF_USERNAME=${c.onvifUser || 'admin'}`,
            `ONVIF_PASSWORD=${c.onvifPass || '<set-me>'}`,
            `ONVIF_DISCOVERY_MODE=${c.discoveryMode || 'auto'}`,
        ];
        if (c.staticCameras) lines.push(`ONVIF_STATIC_CAMERAS=${c.staticCameras}`);
        if (c.cameraNames) lines.push(`ONVIF_CAMERA_NAMES=${c.cameraNames}`);
        lines.push('');
        lines.push(`MEDIA_SERVER=${c.mediaServer || 'mediamtx'}`);
        if ((c.mediaServer || 'mediamtx') === 'mediamtx') {
            lines.push(`MEDIAMTX_HOST=${c.mediaHost || 'localhost'}`);
            lines.push(`MEDIAMTX_API_PORT=${c.mediaPort || '9997'}`);
        } else {
            lines.push(`GO2RTC_HOST=${c.mediaHost || 'localhost'}`);
            lines.push(`GO2RTC_API_PORT=${c.mediaPort || '1984'}`);
        }
        return lines.join('\n');
    }

    renderCommissioningCard() {
        const card = document.createElement("section");
        card.className = "mbridge-card";
        card.innerHTML = `
            <h3>Commissioning</h3>
            <p class="mbridge-card-desc">
                On first run the bridge prints a Matter pairing QR code to its console.
                Scan it with Google Home or Apple Home to add cameras as native Matter devices.
            </p>
            <div class="mbridge-commission">
                <div class="mbridge-qr-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h7v7h-7z"/></svg>
                    <span>QR code shown by bridge process</span>
                </div>
                <div class="mbridge-commission-info">
                    <div class="mbridge-stat-line">
                        <span>Vendor ID</span>
                        <code>0xFFF1 (Test)</code>
                    </div>
                    <div class="mbridge-stat-line">
                        <span>Product ID</span>
                        <code>0x8000</code>
                    </div>
                    <div class="mbridge-stat-line">
                        <span>Discriminator</span>
                        <code>3840</code>
                    </div>
                    <div class="mbridge-stat-line">
                        <span>Setup PIN</span>
                        <code>20202021 (default)</code>
                    </div>
                    <div class="mbridge-stat-line">
                        <span>Max Cameras</span>
                        <code>8 endpoints (7 + motion, 1 video-only)</code>
                    </div>
                </div>
            </div>
        `;
        this.element.append(card);
    }

    renderQuickStartCard() {
        const card = document.createElement("section");
        card.className = "mbridge-card";
        card.innerHTML = `
            <h3>Quick Start</h3>
            <div class="mbridge-quickstart-grid">
                <div>
                    <span class="mbridge-card-label">1. Clone & build</span>
                    <pre class="mbridge-pre">git clone ${REPO_URL}
cd matter-onvif-bridge
cp .env.example .env
# edit .env with your ONVIF credentials
cargo run --release -p matter-onvif-bridge</pre>
                </div>
                <div>
                    <span class="mbridge-card-label">2. Or use Docker (Linux)</span>
                    <pre class="mbridge-pre">docker compose up -d
# host networking required for mDNS + ONVIF multicast</pre>
                </div>
            </div>
            <p class="mbridge-note">
                On macOS the bridge must run natively (Docker can't forward UDP multicast).
                Only the media server runs in Docker on macOS.
            </p>
        `;
        this.element.append(card);
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
