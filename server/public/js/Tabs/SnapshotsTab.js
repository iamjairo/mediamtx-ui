import Tab from "./Tab.js";

export default class SnapshotsTab extends Tab {
    constructor(page) {
        super(page);
        this.streams = [];
        this.refreshInterval = parseInt(localStorage.getItem('snapshots:refresh')) || 5;
        this.snapshotBust = Date.now();
        this.pollingDelay = 5000;
        this.cells = new Map();
    }

    async render() {
        this.element = document.createElement("div");
        this.element.className = "tab snapshots-tab";
        this.page.contentWrapper.append(this.element);

        this.renderHeader();
        this.renderToolbar();
        this.renderGrid();

        await this.loadStreams();
        this.populateGrid();
        this.startRefresh();
        this.poll();
    }

    renderHeader() {
        const header = document.createElement("div");
        header.className = "snap-header";
        header.innerHTML = `
            <div class="snap-header-left">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                <div>
                    <h2>Snapshots</h2>
                    <p>Live thumbnail grid — auto-refreshes every <span class="snap-interval-label">${this.refreshInterval}s</span></p>
                </div>
            </div>
            <div class="snap-header-right">
                <span class="snap-count-badge">0 streams</span>
            </div>
        `;
        this.intervalLabel = header.querySelector('.snap-interval-label');
        this.countBadge = header.querySelector('.snap-count-badge');
        this.element.append(header);
    }

    renderToolbar() {
        const bar = document.createElement("div");
        bar.className = "snap-toolbar";

        const intervalGroup = document.createElement("div");
        intervalGroup.className = "snap-interval-group";

        const label = document.createElement("span");
        label.className = "snap-toolbar-label";
        label.textContent = "Refresh";
        intervalGroup.append(label);

        [2, 5, 10, 30].forEach(sec => {
            const btn = document.createElement("button");
            btn.className = `snap-interval-btn ${sec === this.refreshInterval ? 'active' : ''}`;
            btn.textContent = `${sec}s`;
            btn.addEventListener('click', () => {
                this.refreshInterval = sec;
                localStorage.setItem('snapshots:refresh', sec);
                intervalGroup.querySelectorAll('.snap-interval-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.intervalLabel) this.intervalLabel.textContent = `${sec}s`;
                this.startRefresh();
            });
            intervalGroup.append(btn);
        });
        bar.append(intervalGroup);

        const right = document.createElement("div");
        right.className = "snap-toolbar-right";

        const refreshNow = document.createElement("button");
        refreshNow.className = "phase2-btn sm secondary";
        refreshNow.textContent = "Refresh Now";
        refreshNow.addEventListener('click', () => this.refreshAllSnapshots());
        right.append(refreshNow);

        bar.append(right);
        this.element.append(bar);
    }

    renderGrid() {
        this.grid = document.createElement("div");
        this.grid.className = "snap-grid";
        this.element.append(this.grid);
    }

    async loadStreams() {
        try {
            const res = await this.fm.fetch('/mediamtx/paths/list');
            if (!res) return;
            const data = await res.json();
            if (data.items) this.streams = data.items;
        } catch (e) { this.streams = []; }

        if (this.countBadge) {
            const ready = this.streams.filter(s => s.ready).length;
            this.countBadge.textContent = `${ready} / ${this.streams.length} live`;
        }
    }

    populateGrid() {
        this.grid.innerHTML = '';
        this.cells.clear();

        if (this.streams.length === 0) {
            this.grid.innerHTML = `
                <div class="snap-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" stroke-width="1.3"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                    <p>No streams to display snapshots from.</p>
                </div>
            `;
            return;
        }

        this.streams.forEach(stream => {
            const card = this.createSnapCard(stream);
            this.grid.append(card);
        });
    }

    createSnapCard(stream) {
        const card = document.createElement("article");
        card.className = "snap-card";
        if (!stream.ready) card.classList.add('offline');

        const sourceType = stream.source?.type || '';
        const protocolClass = this.getProtocolClass(sourceType);

        const thumb = document.createElement("div");
        thumb.className = "snap-thumb";

        const img = document.createElement("img");
        img.className = "snap-img";
        img.alt = stream.confName;
        img.loading = "lazy";
        img.addEventListener('error', () => {
            thumb.classList.add('snap-img-error');
        });
        img.addEventListener('load', () => {
            thumb.classList.remove('snap-img-error');
        });
        thumb.append(img);

        const noSignal = document.createElement("div");
        noSignal.className = "snap-no-signal";
        noSignal.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg><span>No signal</span>`;
        thumb.append(noSignal);

        const liveBadge = document.createElement("span");
        liveBadge.className = `snap-status-pill ${stream.ready ? 'on' : 'off'}`;
        liveBadge.textContent = stream.ready ? '● LIVE' : '● OFFLINE';
        thumb.append(liveBadge);

        if (sourceType) {
            const proto = document.createElement("span");
            proto.className = `snap-proto ${protocolClass}`;
            proto.textContent = this.splitCamelCase(sourceType).toUpperCase();
            thumb.append(proto);
        }

        card.append(thumb);

        const body = document.createElement("div");
        body.className = "snap-card-body";

        const title = document.createElement("h4");
        title.className = "snap-name";
        title.textContent = stream.confName;
        title.title = stream.confName;
        body.append(title);

        const meta = document.createElement("div");
        meta.className = "snap-meta";
        const viewers = stream.readers?.length || 0;
        meta.innerHTML = `
            <span>${viewers} viewer${viewers !== 1 ? 's' : ''}</span>
            <button class="snap-view-btn" title="Open in Stream Viewer">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                View
            </button>
        `;
        meta.querySelector('.snap-view-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (!stream.ready) return;
            this.page.viewerHint = { stream: stream.confName, server: 'mediamtx' };
            this.page.tabNavigation.selected = 'streamviewer';
        });
        body.append(meta);

        card.append(body);

        this.cells.set(stream.confName, { card, img, stream });

        this.refreshSnapshot(stream.confName);

        return card;
    }

    refreshSnapshot(name) {
        const cell = this.cells.get(name);
        if (!cell) return;
        if (!cell.stream.ready) return;
        cell.img.src = `/go2rtc/api/frame.jpeg?src=${encodeURIComponent(name)}&_t=${Date.now()}`;
    }

    refreshAllSnapshots() {
        this.snapshotBust = Date.now();
        for (const name of this.cells.keys()) {
            this.refreshSnapshot(name);
        }
    }

    startRefresh() {
        clearInterval(this.refreshCycle);
        this.refreshCycle = setInterval(() => this.refreshAllSnapshots(), this.refreshInterval * 1000);
    }

    poll() {
        clearInterval(this.cycle);
        this.cycle = setInterval(async () => {
            const prevNames = JSON.stringify(this.streams.map(s => s.confName).sort());
            await this.loadStreams();
            const nextNames = JSON.stringify(this.streams.map(s => s.confName).sort());
            if (prevNames !== nextNames) this.populateGrid();
            else {
                this.streams.forEach(s => {
                    const cell = this.cells.get(s.confName);
                    if (cell) {
                        cell.stream = s;
                        cell.card.classList.toggle('offline', !s.ready);
                    }
                });
            }
        }, this.pollingDelay);
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

    destroy() {
        clearInterval(this.cycle);
        clearInterval(this.refreshCycle);
        super.destroy();
    }
}
