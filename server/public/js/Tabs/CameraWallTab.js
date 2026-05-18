import Tab from "./Tab.js";
import Video from "../video.js";
import { playWhep, destroyWhep, getWhepUrl, getHlsUrl } from "../webrtc.js";

export default class CameraWallTab extends Tab {
    constructor(page) {
        super(page);
        this.layout = localStorage.getItem('camerawall:layout') || '2x2';
        this.protocol = localStorage.getItem('camerawall:protocol') || 'hls';
        this.cells = [];
        this.streams = [];
        this.pollingDelay = 2000;
    }

    async render() {
        this.element = document.createElement("div");
        this.element.className = "tab camera-wall";
        this.page.contentWrapper.append(this.element);

        this.renderToolbar();
        this.renderGrid();
        await this.loadStreams();
        this.populateGrid();
        this.poll();
    }

    renderToolbar() {
        this.toolbar = document.createElement("div");
        this.toolbar.className = "camera-toolbar";

        const layoutGroup = document.createElement("div");
        layoutGroup.className = "camera-layout-group";

        ['1x1', '2x2', '3x3', '4x4'].forEach(l => {
            const btn = document.createElement("button");
            btn.className = `camera-layout-btn ${l === this.layout ? 'active' : ''}`;
            btn.textContent = l;
            btn.addEventListener('click', () => {
                this.layout = l;
                localStorage.setItem('camerawall:layout', l);
                layoutGroup.querySelectorAll('.camera-layout-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.grid.setAttribute('data-layout', l);
                this.populateGrid();
            });
            layoutGroup.append(btn);
        });

        this.toolbar.append(layoutGroup);

        const protoGroup = document.createElement("div");
        protoGroup.className = "camera-layout-group camera-proto-group";
        ['hls', 'webrtc'].forEach(p => {
            const btn = document.createElement("button");
            btn.className = `camera-layout-btn ${p === this.protocol ? 'active' : ''}`;
            btn.textContent = p.toUpperCase();
            btn.addEventListener('click', () => {
                this.protocol = p;
                localStorage.setItem('camerawall:protocol', p);
                protoGroup.querySelectorAll('.camera-layout-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.populateGrid();
            });
            protoGroup.append(btn);
        });
        this.toolbar.append(protoGroup);

        const rightGroup = document.createElement("div");
        rightGroup.className = "camera-toolbar-right";

        this.streamCount = document.createElement("span");
        this.streamCount.className = "camera-stream-count";
        this.streamCount.textContent = '0 streams';
        rightGroup.append(this.streamCount);

        const refreshBtn = document.createElement("button");
        refreshBtn.className = "phase2-btn sm secondary";
        refreshBtn.textContent = "Refresh";
        refreshBtn.addEventListener('click', () => this.refresh());
        rightGroup.append(refreshBtn);

        const detachBtn = document.createElement("button");
        detachBtn.className = "phase2-btn sm";
        detachBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Open in Browser`;
        detachBtn.title = "Detach camera wall into a standalone viewer window";
        detachBtn.addEventListener('click', () => this.detachViewer());
        rightGroup.append(detachBtn);

        const fullscreenBtn = document.createElement("button");
        fullscreenBtn.className = "phase2-btn sm secondary";
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.title = "Fullscreen";
        fullscreenBtn.addEventListener('click', () => {
            if (document.fullscreenElement) document.exitFullscreen();
            else this.element.requestFullscreen();
        });
        rightGroup.append(fullscreenBtn);

        this.toolbar.append(rightGroup);
        this.element.append(this.toolbar);
    }

    renderGrid() {
        this.grid = document.createElement("div");
        this.grid.className = "camera-grid";
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

    populateGrid() {
        this.destroyCells();
        this.grid.innerHTML = '';

        const [cols, rows] = this.layout.split('x').map(Number);
        const maxCells = cols * rows;

        for (let i = 0; i < maxCells; i++) {
            const stream = this.streams[i];
            if (stream) {
                const cell = this.createStreamCell(stream);
                this.grid.append(cell);
            } else {
                const empty = this.createEmptyCell(i);
                this.grid.append(empty);
            }
        }
    }

    createStreamCell(streamData) {
        const cell = document.createElement("div");
        cell.className = "camera-cell";

        const sourceType = streamData.source?.type || '';
        const protocolClass = this.getProtocolClass(sourceType);
        if (protocolClass) cell.classList.add(protocolClass);

        const videoEl = document.createElement("video");
        videoEl.autoplay = true;
        videoEl.muted = true;
        videoEl.setAttribute('muted', '');
        videoEl.playsInline = true;
        videoEl.setAttribute('playsinline', '');

        cell.append(videoEl);

        const overlay = document.createElement("div");
        overlay.className = "overlay";

        const nameEl = document.createElement("span");
        nameEl.className = "stream-name";
        nameEl.textContent = streamData.confName;
        overlay.append(nameEl);

        const badges = document.createElement("div");
        badges.className = "overlay-badges";

        if (sourceType) {
            const protoBadge = document.createElement("span");
            protoBadge.className = `protocol-badge ${protocolClass}`;
            protoBadge.textContent = this.splitCamelCase(sourceType).toUpperCase();
            badges.append(protoBadge);
        }

        const readersCount = streamData.readers?.length || 0;
        const viewerBadge = document.createElement("span");
        viewerBadge.className = "viewer-badge";
        viewerBadge.textContent = `${readersCount} viewer${readersCount !== 1 ? 's' : ''}`;
        badges.append(viewerBadge);

        overlay.append(badges);
        cell.append(overlay);

        const actions = document.createElement("div");
        actions.className = "cell-actions";

        const fullscreenBtn = document.createElement("button");
        fullscreenBtn.className = "cell-action-btn";
        fullscreenBtn.title = "Fullscreen";
        fullscreenBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`;
        fullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openFullscreen(streamData, videoEl);
        });
        actions.append(fullscreenBtn);

        const popoutBtn = document.createElement("button");
        popoutBtn.className = "cell-action-btn";
        popoutBtn.title = "Pop-out";
        popoutBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
        popoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.popOut(streamData);
        });
        actions.append(popoutBtn);

        cell.append(actions);

        const cellData = { cell, videoEl, hls: null, pc: null, streamData };
        if (this.protocol === 'webrtc') {
            this.initWebRTC(cellData, streamData.confName);
        } else {
            const hlsUrl = this.getHlsUrl(streamData.confName);
            this.initHls(cellData, hlsUrl);
        }
        this.cells.push(cellData);

        return cell;
    }

    createEmptyCell(index) {
        const cell = document.createElement("div");
        cell.className = "camera-cell camera-cell-empty";
        cell.innerHTML = `<span>No stream</span>`;
        return cell;
    }

    initHls(cellData, url) {
        if (typeof Hls === 'undefined') return;

        const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            maxBufferLength: 5,
            backBufferLength: 10,
        });

        hls.attachMedia(cellData.videoEl);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            hls.loadSource(url);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            cellData.videoEl.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                setTimeout(() => {
                    hls.loadSource(url);
                    hls.startLoad();
                }, 3000);
            }
            if (data.fatal && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                hls.recoverMediaError();
            }
        });

        cellData.hls = hls;
    }

    async initWebRTC(cellData, name) {
        const whepUrl = getWhepUrl(name, this.settings);
        try {
            cellData.pc = await playWhep(cellData.videoEl, whepUrl, {
                onError: () => {
                    destroyWhep(cellData.pc);
                    cellData.pc = null;
                    const hlsUrl = this.getHlsUrl(name);
                    this.initHls(cellData, hlsUrl);
                }
            });
        } catch (e) {
            const hlsUrl = this.getHlsUrl(name);
            this.initHls(cellData, hlsUrl);
        }
    }

    getHlsUrl(name) {
        const url = new URL(window.location.href);
        const hlsAddr = this.settings?.hls?.hlsAddress || ':8888';
        return `${url.protocol}//${url.hostname}${hlsAddr}/${name}/index.m3u8`;
    }

    getProtocolClass(sourceType) {
        if (!sourceType) return '';
        const type = sourceType.toLowerCase();
        if (type.includes('rtsp')) return 'protocol-rtsp';
        if (type.includes('hls')) return 'protocol-hls';
        if (type.includes('webrtc')) return 'protocol-webrtc';
        if (type.includes('rtmp')) return 'protocol-rtmp';
        if (type.includes('srt')) return 'protocol-srt';
        return '';
    }

    splitCamelCase(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    }

    openFullscreen(streamData, videoEl) {
        const modal = document.createElement("div");
        modal.className = "camera-fullscreen-modal";

        const sourceType = streamData.source?.type || '';
        const tracks = streamData.tracks || [];
        const readers = streamData.readers?.length || 0;
        const bytesRx = ((parseInt(streamData.bytesReceived) || 0) / 1048576).toFixed(2);
        const bytesTx = ((parseInt(streamData.bytesSent) || 0) / 1048576).toFixed(2);

        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-video-wrap">
                    <video autoplay muted playsinline></video>
                </div>
                <div class="modal-info">
                    <h3>${streamData.confName}</h3>
                    <div class="modal-meta">
                        <div class="modal-meta-row"><span>Protocol</span><span>${this.splitCamelCase(sourceType).toUpperCase() || '—'}</span></div>
                        <div class="modal-meta-row"><span>Tracks</span><span>${tracks.join(', ') || '—'}</span></div>
                        <div class="modal-meta-row"><span>Viewers</span><span>${readers}</span></div>
                        <div class="modal-meta-row"><span>Received</span><span>${bytesRx} MB</span></div>
                        <div class="modal-meta-row"><span>Sent</span><span>${bytesTx} MB</span></div>
                        ${streamData.source?.id ? `<div class="modal-meta-row"><span>Source</span><span class="modal-source">${streamData.source.id}</span></div>` : ''}
                    </div>
                    <button class="phase2-btn secondary" id="modal-close">Close</button>
                </div>
            </div>
        `;

        document.body.append(modal);

        const modalVideo = modal.querySelector('video');
        const hlsUrl = this.getHlsUrl(streamData.confName);
        const modalCell = { videoEl: modalVideo, hls: null };
        this.initHls(modalCell, hlsUrl);

        const close = () => {
            if (modalCell.hls) modalCell.hls.destroy();
            modal.remove();
        };

        modal.querySelector('.modal-backdrop').addEventListener('click', close);
        modal.querySelector('#modal-close').addEventListener('click', close);
        document.addEventListener('keydown', function handler(e) {
            if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
        });
    }

    popOut(streamData) {
        const hlsAddr = this.settings?.hls?.hlsAddress || ':8888';
        const port = hlsAddr.replace(':', '');
        const popUrl = `${window.location.origin}/viewer.html?hlsPort=${port}`;
        window.open(popUrl, `stream-${streamData.confName}`, 'width=960,height=540,menubar=no,toolbar=no');
    }

    detachViewer() {
        const hlsAddr = this.settings?.hls?.hlsAddress || ':8888';
        const port = hlsAddr.replace(':', '');
        const popUrl = `${window.location.origin}/viewer.html?hlsPort=${port}`;
        window.open(popUrl, 'camera-wall-viewer', 'width=1280,height=720,menubar=no,toolbar=no');
    }

    poll() {
        clearInterval(this.cycle);
        this.cycle = setInterval(async () => {
            await this.loadStreams();
        }, this.pollingDelay);
    }

    async refresh() {
        await this.loadStreams();
        this.populateGrid();
    }

    destroyCells() {
        this.cells.forEach(c => {
            if (c.hls) c.hls.destroy();
            if (c.pc) destroyWhep(c.pc);
        });
        this.cells = [];
    }

    destroy() {
        clearInterval(this.cycle);
        this.destroyCells();
        super.destroy();
    }
}
