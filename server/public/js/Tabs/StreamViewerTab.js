import Tab from "./Tab.js";
import { playWhep, destroyWhep, getWhepUrl, getHlsUrl } from "../webrtc.js";

export default class StreamViewerTab extends Tab {
    constructor(page) {
        super(page);
        this.sourceServer = localStorage.getItem('streamviewer:server') || 'mediamtx';
        this.protocol = localStorage.getItem('streamviewer:protocol') || 'hls';
        this.streamName = null;
        this.streams = [];
        this.hls = null;
        this.pc = null;
        this.loading = false;
        this.error = null;
    }

    async render() {
        this.element = document.createElement("div");
        this.element.className = "tab stream-viewer-tab";
        this.page.contentWrapper.append(this.element);

        this.parseHashParams();

        this.renderToolbar();
        this.renderStage();
        this.renderSidebar();

        await this.loadStreams();
        this.populateStreamSelect();

        if (this.streamName) {
            await this.startPlayback();
        }
    }

    parseHashParams() {
        const hint = this.page.viewerHint;
        if (hint) {
            if (hint.stream) this.streamName = hint.stream;
            if (hint.server === 'mediamtx' || hint.server === 'go2rtc') this.sourceServer = hint.server;
            if (hint.protocol === 'hls' || hint.protocol === 'webrtc') this.protocol = hint.protocol;
            this.page.viewerHint = null;
        }
    }

    renderToolbar() {
        this.toolbar = document.createElement("div");
        this.toolbar.className = "viewer-toolbar";

        // Server label + toggle
        const srvLabel = document.createElement("span");
        srvLabel.className = "toolbar-label";
        srvLabel.textContent = "Server";
        this.toolbar.append(srvLabel);

        const serverGroup = document.createElement("div");
        serverGroup.className = "camera-layout-group";
        ['mediamtx', 'go2rtc'].forEach(srv => {
            const btn = document.createElement("button");
            btn.className = `camera-layout-btn ${srv === this.sourceServer ? 'active' : ''}`;
            btn.textContent = srv === 'mediamtx' ? 'MediaMTX' : 'Go2RTC';
            btn.addEventListener('click', async () => {
                this.sourceServer = srv;
                localStorage.setItem('streamviewer:server', srv);
                serverGroup.querySelectorAll('.camera-layout-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                await this.loadStreams();
                this.populateStreamSelect();
                this.stopPlayback();
            });
            serverGroup.append(btn);
        });
        this.toolbar.append(serverGroup);

        // Divider
        const div1 = document.createElement("div");
        div1.className = "toolbar-divider";
        this.toolbar.append(div1);

        // Stream selector
        const streamLabel = document.createElement("span");
        streamLabel.className = "toolbar-label";
        streamLabel.textContent = "Stream";
        this.toolbar.append(streamLabel);

        this.streamSelect = document.createElement("select");
        this.streamSelect.className = "viewer-stream-select";
        this.streamSelect.innerHTML = `<option value="">— Select Stream —</option>`;
        this.streamSelect.addEventListener('change', async (e) => {
            this.streamName = e.target.value;
            if (this.streamName) {
                this.updateHash();
                await this.startPlayback();
            } else {
                this.stopPlayback();
            }
        });
        this.toolbar.append(this.streamSelect);

        // Divider
        const div2 = document.createElement("div");
        div2.className = "toolbar-divider";
        this.toolbar.append(div2);

        // Protocol label + toggle
        const protoLabel = document.createElement("span");
        protoLabel.className = "toolbar-label";
        protoLabel.textContent = "Protocol";
        this.toolbar.append(protoLabel);

        const protoGroup = document.createElement("div");
        protoGroup.className = "camera-layout-group";
        ['hls', 'webrtc'].forEach(p => {
            const btn = document.createElement("button");
            btn.className = `camera-layout-btn ${p === this.protocol ? 'active' : ''}`;
            btn.textContent = p.toUpperCase();
            btn.addEventListener('click', async () => {
                this.protocol = p;
                localStorage.setItem('streamviewer:protocol', p);
                protoGroup.querySelectorAll('.camera-layout-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.streamName) {
                    this.updateHash();
                    await this.startPlayback();
                }
            });
            protoGroup.append(btn);
        });
        this.toolbar.append(protoGroup);

        // Spacer pushes action buttons to the right
        const spacer = document.createElement("div");
        spacer.style.flex = '1';
        this.toolbar.append(spacer);

        // Fullscreen
        const fsBtn = document.createElement("button");
        fsBtn.className = "phase2-btn sm secondary";
        fsBtn.title = 'Fullscreen';
        fsBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
        fsBtn.addEventListener('click', () => {
            if (document.fullscreenElement) document.exitFullscreen();
            else this.stage?.requestFullscreen?.();
        });
        this.toolbar.append(fsBtn);

        // Pop-out
        const popBtn = document.createElement("button");
        popBtn.className = "phase2-btn sm secondary";
        popBtn.title = 'Pop-out window';
        popBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
        popBtn.addEventListener('click', () => {
            if (!this.streamName) return;
            const hlsAddr = this.settings?.hls?.hlsAddress || ':8888';
            const port = hlsAddr.replace(':', '');
            window.open(`${window.location.origin}/viewer.html?hlsPort=${port}`, `stream-${this.streamName}`, 'width=1024,height=576,menubar=no,toolbar=no');
        });
        this.toolbar.append(popBtn);

        this.element.append(this.toolbar);
    }

    renderStage() {
        this.body = document.createElement("div");
        this.body.className = "viewer-body";

        this.stage = document.createElement("div");
        this.stage.className = "viewer-stage";

        this.videoEl = document.createElement("video");
        this.videoEl.autoplay = true;
        this.videoEl.muted = true;
        this.videoEl.playsInline = true;
        this.videoEl.controls = true;
        this.stage.append(this.videoEl);

        this.placeholder = document.createElement("div");
        this.placeholder.className = "viewer-placeholder";
        this.placeholder.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M22 8.5l-6 3.5 6 3.5z"/></svg>
            <p>Select a stream to begin playback</p>
        `;
        this.stage.append(this.placeholder);

        this.statusOverlay = document.createElement("div");
        this.statusOverlay.className = "viewer-status-overlay";
        this.stage.append(this.statusOverlay);

        this.body.append(this.stage);
        this.element.append(this.body);
    }

    renderSidebar() {
        this.sidebar = document.createElement("aside");
        this.sidebar.className = "viewer-sidebar";
        this.body.append(this.sidebar);
        this.updateSidebar();
    }

    updateSidebar() {
        if (!this.streamName) {
            this.sidebar.innerHTML = `
                <div class="viewer-info-card viewer-empty-sidebar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" stroke-width="1.5" opacity="0.4"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                    <h4>Stream Info</h4>
                    <p class="muted">Select a stream to view details</p>
                </div>
            `;
            return;
        }

        const stream = this.streams.find(s => s.name === this.streamName);
        if (!stream) {
            this.sidebar.innerHTML = `
                <div class="viewer-info-card viewer-empty-sidebar">
                    <h4>Stream Info</h4>
                    <p class="muted">Stream not found in current server.</p>
                </div>
            `;
            return;
        }

        const tracks = stream.tracks || [];
        const viewers = stream.readers?.length || 0;
        const rxMB = ((parseInt(stream.bytesReceived) || 0) / 1048576).toFixed(2);
        const txMB = ((parseInt(stream.bytesSent) || 0) / 1048576).toFixed(2);
        const sourceId = stream.source?.id || stream.src || '—';
        const sourceType = stream.sourceType || stream.source?.type || 'unknown';

        this.sidebar.innerHTML = `
            <div class="viewer-info-card viewer-name-card">
                <div class="viewer-name-row">
                    <h4>${this.escapeHtml(stream.name)}</h4>
                    <span class="viewer-status-pill ${stream.ready ? 'on' : 'off'}">${stream.ready ? '● LIVE' : '● OFFLINE'}</span>
                </div>
            </div>
            <div class="viewer-info-card">
                <h5>Details</h5>
                <div class="info-row"><span>Protocol</span><span>${this.splitCamelCase(sourceType).toUpperCase()}</span></div>
                <div class="info-row"><span>Server</span><span>${this.sourceServer === 'mediamtx' ? 'MediaMTX' : 'Go2RTC'}</span></div>
                <div class="info-row"><span>Playback</span><span>${this.protocol.toUpperCase()}</span></div>
                <div class="info-row"><span>Viewers</span><span>${viewers}</span></div>
                <div class="info-row"><span>Received</span><span>${rxMB} MB</span></div>
                <div class="info-row"><span>Sent</span><span>${txMB} MB</span></div>
            </div>
            ${tracks.length > 0 ? `
                <div class="viewer-info-card">
                    <h5>Tracks</h5>
                    ${tracks.map(t => `<div class="track-row">${this.escapeHtml(typeof t === 'string' ? t : JSON.stringify(t))}</div>`).join('')}
                </div>
            ` : ''}
            <div class="viewer-info-card">
                <h5>Source</h5>
                <div class="src-text-block">${this.escapeHtml(sourceId)}</div>
            </div>
        `;
    }

    async loadStreams() {
        if (this.sourceServer === 'mediamtx') {
            try {
                const res = await this.fm.fetch('/mediamtx/paths/list');
                const data = await res.json();
                this.streams = (data.items || []).map(p => ({
                    name: p.name,
                    ready: p.ready,
                    tracks: p.tracks,
                    readers: p.readers,
                    bytesReceived: p.bytesReceived,
                    bytesSent: p.bytesSent,
                    source: p.source,
                    sourceType: p.sourceType,
                }));
            } catch (e) {
                this.streams = [];
            }
        } else {
            try {
                const res = await this.fm.fetch('/go2rtc/api/streams');
                const data = await res.json();
                const arr = Array.isArray(data) ? data : Object.entries(data).map(([name, info]) => ({
                    name,
                    src: info?.producers?.[0]?.url || '',
                    ready: !!(info?.consumers?.length || info?.producers?.length),
                }));
                this.streams = arr;
            } catch (e) {
                this.streams = [];
            }
        }
    }

    populateStreamSelect() {
        this.streamSelect.innerHTML = `<option value="">— Select Stream —</option>`;
        for (const s of this.streams) {
            const opt = document.createElement("option");
            opt.value = s.name;
            opt.textContent = `${s.name} ${s.ready ? '●' : '○'}`;
            if (s.name === this.streamName) opt.selected = true;
            this.streamSelect.append(opt);
        }
    }

    async startPlayback() {
        this.stopPlayback();
        this.placeholder.style.display = 'none';
        this.videoEl.style.display = 'block';
        this.statusOverlay.textContent = 'Loading...';
        this.statusOverlay.style.display = 'block';
        this.updateSidebar();

        try {
            if (this.protocol === 'webrtc') {
                const whepUrl = this.sourceServer === 'go2rtc'
                    ? `/go2rtc/api/webrtc?src=${encodeURIComponent(this.streamName)}`
                    : getWhepUrl(this.streamName, this.settings);
                this.pc = await playWhep(this.videoEl, whepUrl, {
                    onError: (err) => {
                        this.statusOverlay.textContent = `WebRTC error: ${err.message}`;
                        this.statusOverlay.style.display = 'block';
                    }
                });
                this.statusOverlay.style.display = 'none';
            } else {
                const hlsUrl = this.sourceServer === 'go2rtc'
                    ? `/go2rtc/api/stream.m3u8?src=${encodeURIComponent(this.streamName)}`
                    : getHlsUrl(this.streamName, this.settings);
                this.initHls(hlsUrl);
            }
        } catch (e) {
            this.statusOverlay.textContent = `Playback error: ${e.message}`;
            this.statusOverlay.style.display = 'block';
        }
    }

    initHls(hlsUrl) {
        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            this.hls = new Hls({ enableWorker: true, lowLatencyMode: true });
            this.hls.attachMedia(this.videoEl);
            this.hls.on(Hls.Events.MEDIA_ATTACHED, () => this.hls.loadSource(hlsUrl));
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.statusOverlay.style.display = 'none';
                this.videoEl.play().catch(() => {});
            });
            this.hls.on(Hls.Events.ERROR, (_, data) => {
                if (data.fatal) {
                    this.statusOverlay.textContent = `HLS error: ${data.type}`;
                    this.statusOverlay.style.display = 'block';
                }
            });
        } else {
            this.videoEl.src = hlsUrl;
            this.videoEl.addEventListener('loadeddata', () => {
                this.statusOverlay.style.display = 'none';
            }, { once: true });
        }
    }

    stopPlayback() {
        if (this.hls) { this.hls.destroy(); this.hls = null; }
        if (this.pc) { destroyWhep(this.pc); this.pc = null; }
        this.videoEl.srcObject = null;
        this.videoEl.removeAttribute('src');
        this.videoEl.load();
    }

    updateHash() {
        // Persist current state on the page so navigating away and back resumes.
        this.page.viewerHint = { stream: this.streamName, server: this.sourceServer, protocol: this.protocol };
    }

    splitCamelCase(s) {
        if (!s) return '';
        return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    }

    escapeHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    destroy() {
        this.stopPlayback();
        super.destroy();
    }
}
