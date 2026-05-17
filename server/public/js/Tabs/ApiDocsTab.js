import Tab from "./Tab.js";

const ENDPOINTS = {
    mediamtx: {
        label: 'MediaMTX',
        baseUrl: '/mediamtx',
        groups: [
            {
                name: 'Paths',
                endpoints: [
                    { method: 'GET', path: '/paths/list', desc: 'List all active paths and their state', testable: true },
                    { method: 'GET', path: '/paths/get/{name}', desc: 'Get details for one path', testable: false },
                    { method: 'GET', path: '/config/paths/list', desc: 'List path configurations', testable: true },
                    { method: 'GET', path: '/config/paths/get/{name}', desc: 'Get one path configuration', testable: false },
                    { method: 'POST', path: '/config/paths/add/{name}', desc: 'Add a path config', testable: false, body: '{"source":"rtsp://..."}' },
                    { method: 'PATCH', path: '/config/paths/patch/{name}', desc: 'Update path config (partial)', testable: false },
                    { method: 'DELETE', path: '/config/paths/delete/{name}', desc: 'Delete a path config', testable: false },
                ],
            },
            {
                name: 'Config',
                endpoints: [
                    { method: 'GET', path: '/config/global/get', desc: 'Get global server config', testable: true },
                    { method: 'PATCH', path: '/config/global/patch', desc: 'Update global config', testable: false },
                    { method: 'GET', path: '/config/pathdefaults/get', desc: 'Get path defaults', testable: true },
                    { method: 'PATCH', path: '/config/pathdefaults/patch', desc: 'Update path defaults', testable: false },
                ],
            },
            {
                name: 'Recordings',
                endpoints: [
                    { method: 'GET', path: '/recordings/list', desc: 'List all recordings (segments grouped by path)', testable: true },
                    { method: 'GET', path: '/recordings/get?path={name}', desc: 'Get recordings for a specific path', testable: false },
                ],
            },
            {
                name: 'Sessions',
                endpoints: [
                    { method: 'GET', path: '/rtspsessions/list', desc: 'Active RTSP sessions', testable: true },
                    { method: 'GET', path: '/rtmpconns/list', desc: 'Active RTMP connections', testable: true },
                    { method: 'GET', path: '/hlsmuxers/list', desc: 'Active HLS muxers', testable: true },
                    { method: 'GET', path: '/webrtcsessions/list', desc: 'Active WebRTC sessions', testable: true },
                    { method: 'GET', path: '/srtconns/list', desc: 'Active SRT connections', testable: true },
                ],
            },
            {
                name: 'Diagnostics',
                endpoints: [
                    { method: 'GET', path: '/logs', desc: 'Recent server logs (proxy endpoint)', testable: true },
                ],
            },
        ],
    },
    go2rtc: {
        label: 'Go2RTC',
        baseUrl: '/go2rtc/api',
        groups: [
            {
                name: 'Streams',
                endpoints: [
                    { method: 'GET', path: '/streams', desc: 'List all streams', testable: true },
                    { method: 'PUT', path: '/streams?src={name}', desc: 'Add or update a stream', testable: false, body: 'rtsp://192.168.1.50:554/h264' },
                    { method: 'DELETE', path: '/streams?src={name}', desc: 'Delete a stream', testable: false },
                ],
            },
            {
                name: 'Playback',
                endpoints: [
                    { method: 'GET', path: '/stream.m3u8?src={name}', desc: 'HLS playlist for a stream', testable: false },
                    { method: 'POST', path: '/webrtc?src={name}', desc: 'WHEP offer/answer for WebRTC playback', testable: false, body: 'v=0\r\no=- 0 0 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\n... (SDP offer)' },
                ],
            },
            {
                name: 'Diagnostics',
                endpoints: [
                    { method: 'GET', path: '/streams.dot', desc: 'Graphviz diagram of stream topology', testable: true },
                    { method: 'GET', path: '/log', desc: 'Server logs', testable: true },
                ],
            },
        ],
    },
};

export default class ApiDocsTab extends Tab {
    constructor(page) {
        super(page);
        this.activeServer = localStorage.getItem('apidocs:server') || 'mediamtx';
    }

    async render() {
        this.element = document.createElement("div");
        this.element.className = "tab api-docs-tab";
        this.page.contentWrapper.append(this.element);

        this.renderHeader();
        this.renderTabs();
        this.renderContent();
    }

    renderHeader() {
        const header = document.createElement("div");
        header.className = "apidocs-header";
        header.innerHTML = `
            <div class="apidocs-header-left">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                <div>
                    <h2>API Reference</h2>
                    <p>Interactive endpoint explorer for MediaMTX and Go2RTC</p>
                </div>
            </div>
        `;
        this.element.append(header);
    }

    renderTabs() {
        const tabs = document.createElement("div");
        tabs.className = "apidocs-tabs";
        Object.entries(ENDPOINTS).forEach(([key, val]) => {
            const btn = document.createElement("button");
            btn.className = `apidocs-tab-btn ${key === this.activeServer ? 'active' : ''}`;
            btn.innerHTML = `<span class="apidocs-tab-dot ${key}"></span>${val.label}`;
            btn.addEventListener('click', () => {
                this.activeServer = key;
                localStorage.setItem('apidocs:server', key);
                tabs.querySelectorAll('.apidocs-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderEndpoints();
            });
            tabs.append(btn);
        });
        this.element.append(tabs);
    }

    renderContent() {
        this.contentWrap = document.createElement("div");
        this.contentWrap.className = "apidocs-content";
        this.element.append(this.contentWrap);
        this.renderEndpoints();
    }

    renderEndpoints() {
        this.contentWrap.innerHTML = '';
        const config = ENDPOINTS[this.activeServer];

        const baseInfo = document.createElement("div");
        baseInfo.className = "apidocs-base-url";
        baseInfo.innerHTML = `<span>Base URL</span><code>${this.escapeHtml(window.location.origin + config.baseUrl)}</code>`;
        this.contentWrap.append(baseInfo);

        config.groups.forEach(group => {
            const section = document.createElement("section");
            section.className = "apidocs-group";

            const heading = document.createElement("h3");
            heading.className = "apidocs-group-heading";
            heading.innerHTML = `<span class="apidocs-group-name">${this.escapeHtml(group.name)}</span><span class="apidocs-group-count">${group.endpoints.length} endpoint${group.endpoints.length !== 1 ? 's' : ''}</span>`;
            section.append(heading);

            group.endpoints.forEach(ep => {
                section.append(this.renderEndpoint(ep, config.baseUrl));
            });

            this.contentWrap.append(section);
        });
    }

    renderEndpoint(ep, baseUrl) {
        const card = document.createElement("article");
        card.className = "apidocs-endpoint";

        const header = document.createElement("header");
        header.className = "apidocs-endpoint-header";
        header.innerHTML = `
            <span class="apidocs-method method-${ep.method.toLowerCase()}">${ep.method}</span>
            <code class="apidocs-path">${this.escapeHtml(ep.path)}</code>
            <span class="apidocs-desc">${this.escapeHtml(ep.desc)}</span>
            <button class="apidocs-toggle" aria-label="Expand">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
        `;
        card.append(header);

        const body = document.createElement("div");
        body.className = "apidocs-endpoint-body";

        const fullUrl = `${baseUrl}${ep.path}`;
        let bodyHtml = `
            <div class="apidocs-row">
                <span class="apidocs-row-label">Full URL</span>
                <code class="apidocs-row-value">${this.escapeHtml(fullUrl)}</code>
            </div>
        `;

        if (ep.body) {
            bodyHtml += `
                <div class="apidocs-row">
                    <span class="apidocs-row-label">Request Body</span>
                    <pre class="apidocs-pre">${this.escapeHtml(ep.body)}</pre>
                </div>
            `;
        }

        if (ep.testable && ep.method === 'GET') {
            bodyHtml += `
                <div class="apidocs-actions">
                    <button class="phase2-btn sm apidocs-try-btn">Try it</button>
                    <button class="phase2-btn sm secondary apidocs-copy-btn">Copy URL</button>
                </div>
                <div class="apidocs-response" style="display:none">
                    <span class="apidocs-row-label">Response</span>
                    <pre class="apidocs-pre apidocs-response-pre">—</pre>
                </div>
            `;
        } else {
            bodyHtml += `
                <div class="apidocs-actions">
                    <button class="phase2-btn sm secondary apidocs-copy-btn">Copy URL</button>
                </div>
            `;
        }

        body.innerHTML = bodyHtml;
        card.append(body);

        const toggleBtn = header.querySelector('.apidocs-toggle');
        toggleBtn.addEventListener('click', () => {
            card.classList.toggle('open');
        });
        header.addEventListener('click', (e) => {
            if (e.target.closest('.apidocs-toggle')) return;
            card.classList.toggle('open');
        });

        const copyBtn = body.querySelector('.apidocs-copy-btn');
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(window.location.origin + fullUrl).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy URL'; }, 1500);
            });
        });

        const tryBtn = body.querySelector('.apidocs-try-btn');
        if (tryBtn) {
            tryBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const responseEl = body.querySelector('.apidocs-response');
                const preEl = body.querySelector('.apidocs-response-pre');
                responseEl.style.display = 'block';
                preEl.textContent = 'Loading...';
                tryBtn.disabled = true;
                try {
                    const res = await this.fm.fetch(fullUrl);
                    if (!res) {
                        preEl.textContent = 'Error: request failed (server unreachable)';
                        return;
                    }
                    const text = await res.text();
                    try {
                        preEl.textContent = JSON.stringify(JSON.parse(text), null, 2);
                    } catch {
                        preEl.textContent = text;
                    }
                } catch (err) {
                    preEl.textContent = `Error: ${err.message}`;
                } finally {
                    tryBtn.disabled = false;
                }
            });
        }

        return card;
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
