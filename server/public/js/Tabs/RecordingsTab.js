import Tab from "./Tab.js";

export default class RecordingsTab extends Tab {
    constructor(page) {
        super(page);
        this.recordings = [];
        this.search = '';
        this.statusFilter = 'all';
        this.playingId = null;
        this.hlsInstances = [];
        this.pollingInterval = null;
    }

    async render() {
        this.element = document.createElement("div");
        this.element.className = "tab recordings-tab";
        this.page.contentWrapper.append(this.element);

        this.renderHeader();
        this.renderFilters();
        this.gridEl = document.createElement("div");
        this.gridEl.className = "rec-grid";
        this.element.append(this.gridEl);

        await this.loadRecordings();
        this.renderGrid();
        this.pollingInterval = setInterval(() => this.loadRecordings(), 10000);
    }

    renderHeader() {
        const header = document.createElement("div");
        header.className = "rec-header";
        header.innerHTML = `
            <div class="rec-header-left">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>
                <div>
                    <h2 class="rec-title">Recordings</h2>
                    <p class="rec-subtitle">Browse and play back recorded streams</p>
                </div>
            </div>
            <div class="rec-header-right">
                <span class="rec-count-badge">0 clips</span>
                <button class="phase2-btn sm secondary rec-refresh-btn">Refresh</button>
            </div>
        `;
        header.querySelector('.rec-refresh-btn').addEventListener('click', () => this.refresh());
        this.countBadge = header.querySelector('.rec-count-badge');
        this.element.append(header);
    }

    renderFilters() {
        const bar = document.createElement("div");
        bar.className = "rec-filter-bar";
        bar.innerHTML = `
            <div class="rec-search-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" class="rec-search" placeholder="Search recordings..." />
            </div>
            <select class="rec-status-select">
                <option value="all">All Status</option>
                <option value="complete">Complete</option>
                <option value="recording">Recording</option>
                <option value="failed">Failed</option>
            </select>
        `;
        bar.querySelector('.rec-search').addEventListener('input', (e) => {
            this.search = e.target.value.toLowerCase();
            this.renderGrid();
        });
        bar.querySelector('.rec-status-select').addEventListener('change', (e) => {
            this.statusFilter = e.target.value;
            this.renderGrid();
        });
        this.element.append(bar);
    }

    async loadRecordings() {
        try {
            const res = await this.fm.fetch('/mediamtx/recordings/list');
            if (!res) return;
            const body = await res.json();
            const items = Array.isArray(body) ? body : (body.items || []);
            this.recordings = this.flattenRecordings(items);
            if (this.countBadge) {
                this.countBadge.textContent = `${this.recordings.length} clip${this.recordings.length !== 1 ? 's' : ''}`;
            }
        } catch (e) {
            this.recordings = this.getMockRecordings();
            if (this.countBadge) {
                this.countBadge.innerHTML = `${this.recordings.length} clips <span class="rec-mock-badge">MOCK</span>`;
            }
        }
    }

    flattenRecordings(paths) {
        const recs = [];
        for (const p of paths) {
            for (const seg of (p.segments || [])) {
                const start = new Date(seg.start);
                const dur = seg.duration || 0;
                const end = dur > 0 ? new Date(start.getTime() + dur * 1000) : null;
                recs.push({
                    id: `${p.name}-${seg.start}`,
                    pathName: p.name,
                    displayName: this.deriveDisplayName(p.name),
                    startTime: start,
                    endTime: end,
                    duration: dur,
                    status: dur === 0 ? 'recording' : 'complete',
                    filename: `${p.name.replace(/\//g, '_')}_${start.toISOString().replace(/[:.]/g, '-')}.mp4`,
                });
            }
        }
        return recs.sort((a, b) => b.startTime - a.startTime);
    }

    deriveDisplayName(path) {
        const last = path.split('/').pop() || path;
        return last.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    getMockRecordings() {
        const now = Date.now();
        return [
            { id: 'mock-1', pathName: 'cam/front-door', displayName: 'Front Door', startTime: new Date(now - 3600000), endTime: new Date(now - 1800000), duration: 1800, status: 'complete', filename: 'cam_front-door_recording.mp4' },
            { id: 'mock-2', pathName: 'cam/backyard', displayName: 'Backyard', startTime: new Date(now - 600000), endTime: null, duration: 0, status: 'recording', filename: 'cam_backyard_live.mp4' },
            { id: 'mock-3', pathName: 'cam/garage', displayName: 'Garage', startTime: new Date(now - 86400000), endTime: new Date(now - 82800000), duration: 3600, status: 'complete', filename: 'cam_garage_overnight.mp4' },
            { id: 'mock-4', pathName: 'stream/rtmp-ingest', displayName: 'RTMP Ingest', startTime: new Date(now - 7200000), endTime: new Date(now - 3600000), duration: 3600, status: 'complete', filename: 'stream_rtmp-ingest.mp4' },
        ];
    }

    getFilteredRecordings() {
        return this.recordings.filter(r => {
            if (this.search && !r.pathName.toLowerCase().includes(this.search) && !r.displayName.toLowerCase().includes(this.search)) return false;
            if (this.statusFilter !== 'all' && r.status !== this.statusFilter) return false;
            return true;
        });
    }

    renderGrid() {
        this.destroyPlayers();
        this.gridEl.innerHTML = '';

        const filtered = this.getFilteredRecordings();

        if (filtered.length === 0) {
            this.gridEl.innerHTML = `
                <div class="rec-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
                    <p>${this.recordings.length === 0 ? 'No recordings found. Streams will appear here when recording is enabled.' : 'No recordings match your filters.'}</p>
                </div>
            `;
            return;
        }

        for (const rec of filtered) {
            this.gridEl.append(this.createCard(rec));
        }
    }

    createCard(rec) {
        const card = document.createElement("div");
        card.className = "rec-card";
        card.setAttribute('data-id', rec.id);

        const statusClass = rec.status === 'recording' ? 'rec-status-live' : rec.status === 'failed' ? 'rec-status-failed' : 'rec-status-complete';
        const statusLabel = rec.status === 'recording' ? 'REC' : rec.status === 'failed' ? 'FAILED' : 'COMPLETE';
        const durStr = this.formatDuration(rec.duration);

        card.innerHTML = `
            <div class="rec-card-preview">
                <div class="rec-card-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
                <span class="rec-card-duration">${durStr}</span>
                ${rec.status === 'recording' ? '<span class="rec-card-live-pill">REC</span>' : ''}
                <button class="rec-card-play-overlay" title="Play">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </button>
            </div>
            <div class="rec-card-body">
                <div class="rec-card-name">${rec.displayName}</div>
                <div class="rec-card-path">${rec.pathName}</div>
                <div class="rec-card-meta">
                    <span class="rec-card-status ${statusClass}">${statusLabel}</span>
                    <span class="rec-card-time">${rec.startTime.toLocaleString()}</span>
                </div>
            </div>
        `;

        const playBtn = card.querySelector('.rec-card-play-overlay');
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlay(rec, card);
        });

        card.addEventListener('click', () => this.openModal(rec));

        return card;
    }

    togglePlay(rec, card) {
        const preview = card.querySelector('.rec-card-preview');

        if (this.playingId === rec.id) {
            this.destroyPlayers();
            this.playingId = null;
            const placeholder = preview.querySelector('.rec-card-placeholder');
            if (placeholder) placeholder.style.display = '';
            const video = preview.querySelector('video');
            if (video) video.remove();
            return;
        }

        this.playingId = rec.id;
        const placeholder = preview.querySelector('.rec-card-placeholder');
        if (placeholder) placeholder.style.display = 'none';

        const video = document.createElement('video');
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.controls = true;
        video.className = 'rec-card-video';
        preview.prepend(video);

        const playbackUrl = this.getPlaybackUrl(rec);
        this.initHls(video, playbackUrl);
    }

    getPlaybackUrl(rec) {
        const url = new URL(window.location.href);
        const params = new URLSearchParams({
            path: rec.pathName,
            start: rec.startTime.toISOString(),
        });
        if (rec.duration > 0) params.set('duration', String(rec.duration));
        const recordAddr = this.settings?.record?.recordAddress || ':9996';
        return `${url.protocol}//${url.hostname}${recordAddr}/get?${params.toString()}`;
    }

    initHls(videoEl, hlsUrl) {
        if (typeof Hls === 'undefined' || !Hls.isSupported()) {
            videoEl.src = hlsUrl;
            return;
        }
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(hlsUrl));
        hls.on(Hls.Events.MANIFEST_PARSED, () => videoEl.play().catch(() => {}));
        hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                videoEl.src = hlsUrl;
            }
        });
        this.hlsInstances.push(hls);
    }

    openModal(rec) {
        const modal = document.createElement("div");
        modal.className = "rec-modal";

        const durStr = this.formatDuration(rec.duration);
        const statusClass = rec.status === 'recording' ? 'rec-status-live' : rec.status === 'complete' ? 'rec-status-complete' : 'rec-status-failed';

        modal.innerHTML = `
            <div class="rec-modal-backdrop"></div>
            <div class="rec-modal-content">
                <button class="rec-modal-close">&times;</button>
                <div class="rec-modal-video-wrap">
                    <video autoplay muted playsinline controls></video>
                </div>
                <div class="rec-modal-info">
                    <h3>${rec.displayName}</h3>
                    <div class="rec-modal-meta">
                        <div class="rec-modal-row"><span>Path</span><span>${rec.pathName}</span></div>
                        <div class="rec-modal-row"><span>Duration</span><span>${durStr}</span></div>
                        <div class="rec-modal-row"><span>Status</span><span class="${statusClass}">${rec.status.toUpperCase()}</span></div>
                        <div class="rec-modal-row"><span>Started</span><span>${rec.startTime.toLocaleString()}</span></div>
                        ${rec.endTime ? `<div class="rec-modal-row"><span>Ended</span><span>${rec.endTime.toLocaleString()}</span></div>` : ''}
                        <div class="rec-modal-row"><span>File</span><span class="rec-mono">${rec.filename}</span></div>
                    </div>
                </div>
            </div>
        `;

        document.body.append(modal);

        const video = modal.querySelector('video');
        const playbackUrl = this.getPlaybackUrl(rec);
        this.initHls(video, playbackUrl);

        const close = () => {
            this.destroyPlayers();
            modal.remove();
        };

        modal.querySelector('.rec-modal-backdrop').addEventListener('click', close);
        modal.querySelector('.rec-modal-close').addEventListener('click', close);
        const escHandler = (e) => {
            if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
        };
        document.addEventListener('keydown', escHandler);
    }

    formatDuration(seconds) {
        if (!seconds || !Number.isFinite(seconds) || seconds === 0) return 'Live';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    async refresh() {
        await this.loadRecordings();
        this.renderGrid();
    }

    destroyPlayers() {
        this.hlsInstances.forEach(h => { if (h) h.destroy(); });
        this.hlsInstances = [];
    }

    destroy() {
        clearInterval(this.pollingInterval);
        this.destroyPlayers();
        super.destroy();
    }
}
