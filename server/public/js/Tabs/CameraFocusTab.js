import Tab from "./Tab.js";

export default class CameraFocusTab extends Tab {
    constructor(page) {
        super(page);
        this.layout = localStorage.getItem('camerafocus:layout') || '1plus5';
        this.streams = [];
        this.cells = [];
        this.pollingDelay = 2000;
    }

    async render() {
        this.element = document.createElement("div");
        this.element.className = "tab camera-focus-tab";
        this.page.contentWrapper.append(this.element);

        this.renderToolbar();
        this.renderGrid();
        await this.loadStreams();
        this.populateGrid();
        this.poll();
    }

    renderToolbar() {
        this.toolbar = document.createElement("div");
        this.toolbar.className = "focus-toolbar";

        const layoutGroup = document.createElement("div");
        layoutGroup.className = "focus-layout-group";

        const layouts = [
            { id: '1plus5', label: '1+5 focus' },
            { id: '2plus4', label: '2+4 mix' },
            { id: '1plus3', label: '1+3 focus' },
        ];
        layouts.forEach(({ id, label }) => {
            const btn = document.createElement("button");
            btn.className = `focus-layout-btn ${id === this.layout ? 'active' : ''}`;
            btn.setAttribute('data-layout', id);
            btn.textContent = label;
            btn.addEventListener('click', () => {
                this.layout = id;
                localStorage.setItem('camerafocus:layout', id);
                layoutGroup.querySelectorAll('.focus-layout-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.grid.setAttribute('data-layout', id);
                this.populateGrid();
            });
            layoutGroup.append(btn);
        });
        this.toolbar.append(layoutGroup);

        const right = document.createElement("div");
        right.className = "focus-toolbar-right";

        this.streamCount = document.createElement("span");
        this.streamCount.className = "focus-stream-count";
        this.streamCount.textContent = '0 streams';
        right.append(this.streamCount);

        const refreshBtn = document.createElement("button");
        refreshBtn.className = "phase2-btn sm secondary";
        refreshBtn.textContent = "Refresh";
        refreshBtn.addEventListener('click', () => this.refresh());
        right.append(refreshBtn);

        const fsBtn = document.createElement("button");
        fsBtn.className = "phase2-btn sm secondary";
        fsBtn.title = "Fullscreen";
        fsBtn.innerHTML = '⛶';
        fsBtn.addEventListener('click', () => {
            if (document.fullscreenElement) document.exitFullscreen();
            else this.element.requestFullscreen?.();
        });
        right.append(fsBtn);

        this.toolbar.append(right);
        this.element.append(this.toolbar);
    }

    renderGrid() {
        this.grid = document.createElement("div");
        this.grid.className = "focus-grid";
        this.grid.setAttribute('data-layout', this.layout);
        this.element.append(this.grid);
    }

    async loadStreams() {
        try {
            const res = await this.fm.fetch('/mediamtx/paths/list');
            if (!res) return;
            const data = await res.json();
            if (data.items) {
                this.streams = data.items;
                this.streamCount.textContent = `${this.streams.length} stream${this.streams.length !== 1 ? 's' : ''}`;
            }
        } catch (e) {}
    }

    cellCountForLayout() {
        return { '1plus5': 6, '2plus4': 6, '1plus3': 4 }[this.layout] || 6;
    }

    populateGrid() {
        this.destroyCells();
        this.grid.innerHTML = '';

        const maxCells = this.cellCountForLayout();
        for (let i = 0; i < maxCells; i++) {
            const stream = this.streams[i];
            if (stream) {
                this.grid.append(this.createStreamCell(stream));
            } else {
                this.grid.append(this.createEmptyCell());
            }
        }
    }

    createStreamCell(streamData) {
        const cell = document.createElement("div");
        cell.className = "focus-cell";

        const sourceType = streamData.source?.type || '';
        const protocolClass = this.getProtocolClass(sourceType);

        const video = document.createElement("video");
        video.autoplay = true;
        video.muted = true;
        video.setAttribute('muted', '');
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        cell.append(video);

        const overlay = document.createElement("div");
        overlay.className = "focus-cell-overlay";
        overlay.innerHTML = `
            <span class="focus-cell-name">
                <span class="focus-cell-dot ${streamData.ready ? 'on' : 'off'}"></span>
                ${this.escapeHtml(streamData.confName)}
            </span>
            ${sourceType ? `<span class="focus-cell-proto ${protocolClass}">${this.splitCamelCase(sourceType).toUpperCase()}</span>` : ''}
        `;
        cell.append(overlay);

        const expandBtn = document.createElement("button");
        expandBtn.className = "focus-cell-expand";
        expandBtn.title = "Expand to fullscreen";
        expandBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`;
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openFullscreen(streamData);
        });
        cell.append(expandBtn);

        const hls = this.initHls(video, this.getHlsUrl(streamData.confName));
        this.cells.push({ hls, video });

        return cell;
    }

    createEmptyCell() {
        const cell = document.createElement("div");
        cell.className = "focus-cell focus-cell-empty";
        cell.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M22 8.5l-6 3.5 6 3.5z"/></svg>`;
        return cell;
    }

    initHls(videoEl, url) {
        if (typeof Hls === 'undefined' || !Hls.isSupported()) return null;
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true, maxBufferLength: 5, backBufferLength: 10 });
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url));
        hls.on(Hls.Events.MANIFEST_PARSED, () => videoEl.play().catch(() => {}));
        hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR)
                setTimeout(() => { hls.loadSource(url); hls.startLoad(); }, 3000);
            if (data.fatal && data.type === Hls.ErrorTypes.MEDIA_ERROR)
                hls.recoverMediaError();
        });
        return hls;
    }

    getHlsUrl(name) {
        const url = new URL(window.location.href);
        const hlsAddr = this.settings?.hls?.hlsAddress || ':8888';
        return `${url.protocol}//${url.hostname}${hlsAddr}/${name}/index.m3u8`;
    }

    getProtocolClass(type) {
        if (!type) return '';
        const t = type.toLowerCase();
        if (t.includes('rtsp')) return 'protocol-rtsp';
        if (t.includes('hls')) return 'protocol-hls';
        if (t.includes('webrtc')) return 'protocol-webrtc';
        if (t.includes('rtmp')) return 'protocol-rtmp';
        if (t.includes('srt')) return 'protocol-srt';
        return '';
    }

    splitCamelCase(s) {
        return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    }

    escapeHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    openFullscreen(streamData) {
        const modal = document.createElement("div");
        modal.className = "focus-fullscreen-modal";
        modal.innerHTML = `
            <div class="focus-modal-backdrop"></div>
            <div class="focus-modal-content">
                <video autoplay muted playsinline></video>
                <div class="focus-modal-title">${this.escapeHtml(streamData.confName)}</div>
                <button class="focus-modal-close">✕</button>
            </div>
        `;
        document.body.append(modal);

        const video = modal.querySelector('video');
        const hls = this.initHls(video, this.getHlsUrl(streamData.confName));

        const close = () => {
            if (hls) hls.destroy();
            modal.remove();
            document.removeEventListener('keydown', keyHandler);
        };
        const keyHandler = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', keyHandler);
        modal.querySelector('.focus-modal-backdrop').addEventListener('click', close);
        modal.querySelector('.focus-modal-close').addEventListener('click', close);
    }

    poll() {
        clearInterval(this.cycle);
        this.cycle = setInterval(() => this.loadStreams(), this.pollingDelay);
    }

    async refresh() {
        await this.loadStreams();
        this.populateGrid();
    }

    destroyCells() {
        this.cells.forEach(c => { if (c.hls) c.hls.destroy(); });
        this.cells = [];
    }

    destroy() {
        clearInterval(this.cycle);
        this.destroyCells();
        super.destroy();
    }
}
