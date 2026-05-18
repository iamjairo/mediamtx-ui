import Tab from "./Tab.js";

export default class MediaMTXSourcesTab extends Tab {
    constructor(page) {
        super(page);
        this.paths = [];
        this.pollingInterval = null;
        this.search = '';
    }

    async render() {
        this.element = document.createElement("div");
        this.element.className = "tab sources-tab";
        this.page.contentWrapper.append(this.element);

        this.renderHeader();
        this.renderFilters();
        this.tableWrap = document.createElement("div");
        this.tableWrap.className = "sources-table-wrap";
        this.element.append(this.tableWrap);

        await this.loadPaths();
        this.renderTable();
        this.pollingInterval = setInterval(() => this.loadPaths().then(() => this.renderTable()), 5000);
    }

    renderHeader() {
        const header = document.createElement("div");
        header.className = "sources-header";
        header.innerHTML = `
            <div class="sources-header-left">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                <div>
                    <h2 class="sources-title">MediaMTX Sources</h2>
                    <p class="sources-subtitle">Live MediaMTX path status — read-only monitoring view</p>
                </div>
            </div>
            <div class="sources-header-right">
                <span class="sources-count-badge">0 / 0 ready</span>
                <button class="phase2-btn sm secondary sources-refresh-btn">Refresh</button>
            </div>
        `;
        header.querySelector('.sources-refresh-btn').addEventListener('click', () => this.refresh());
        this.countBadge = header.querySelector('.sources-count-badge');
        this.element.append(header);
    }

    renderFilters() {
        const bar = document.createElement("div");
        bar.className = "sources-filter-bar";
        bar.innerHTML = `
            <div class="sources-search-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" class="sources-search" placeholder="Search paths..." />
            </div>
        `;
        bar.querySelector('.sources-search').addEventListener('input', (e) => {
            this.search = e.target.value.toLowerCase();
            this.renderTable();
        });
        this.element.append(bar);
    }

    async loadPaths() {
        try {
            const res = await this.fm.fetch('/mediamtx/paths/list');
            if (!res) return;
            const data = await res.json();
            this.paths = data.items || [];
            this.isMock = false;
        } catch (e) {
            this.paths = this.getMockPaths();
            this.isMock = true;
        }

        const ready = this.paths.filter(p => p.ready).length;
        if (this.countBadge) {
            this.countBadge.innerHTML = `${ready} / ${this.paths.length} ready${this.isMock ? ' <span class="sources-mock-badge">MOCK</span>' : ''}`;
        }
    }

    getMockPaths() {
        return [
            { name: 'cam/front-door', source: { type: 'rtspSource', id: 'rtsp://192.168.1.50:554/h264' }, sourceType: 'rtspSource', ready: true, tracks: ['H264 1920x1080', 'AAC 48kHz'], readers: [{}, {}], bytesReceived: 2100000, bytesSent: 850000 },
            { name: 'cam/backyard', source: { type: 'rtspSource', id: 'rtsp://192.168.1.51:554/h264' }, sourceType: 'rtspSource', ready: true, tracks: ['H264 1280x720'], readers: [{}], bytesReceived: 1500000, bytesSent: 350000 },
            { name: 'cam/garage', source: { type: 'rtspSource', id: 'rtsp://192.168.1.52:554/h264' }, sourceType: 'rtspSource', ready: false, tracks: [], readers: [], bytesReceived: 0, bytesSent: 0 },
            { name: 'cam/driveway', source: { type: 'rtspSource', id: 'rtsp://192.168.1.53:554/h264' }, sourceType: 'rtspSource', ready: false, tracks: [], readers: [], bytesReceived: 0, bytesSent: 0 },
            { name: 'ingest/rtmp-source', source: { type: 'rtmpSource', id: 'rtmp://192.168.1.10/live/cam5' }, sourceType: 'rtmpSource', ready: true, tracks: ['H264 1920x1080', 'AAC 44.1kHz'], readers: [{}], bytesReceived: 980000, bytesSent: 400000 },
            { name: 'restream/hls-proxy', source: { type: 'hlsSource', id: 'https://example.com/stream.m3u8' }, sourceType: 'hlsSource', ready: true, tracks: ['H264 1920x1080'], readers: [{}, {}, {}], bytesReceived: 0, bytesSent: 2100000 },
        ];
    }

    getProtocolClass(type) {
        if (!type) return '';
        const t = type.toLowerCase();
        if (t.includes('rtsp')) return 'protocol-rtsp';
        if (t.includes('rtmp')) return 'protocol-rtmp';
        if (t.includes('hls')) return 'protocol-hls';
        if (t.includes('webrtc')) return 'protocol-webrtc';
        if (t.includes('srt')) return 'protocol-srt';
        return '';
    }

    splitCamelCase(s) {
        return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    }

    formatBytes(b) {
        if (!b || b === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    }

    getFiltered() {
        if (!this.search) return this.paths;
        return this.paths.filter(p => p.name.toLowerCase().includes(this.search));
    }

    renderTable() {
        const filtered = this.getFiltered();
        this.tableWrap.innerHTML = '';

        if (filtered.length === 0) {
            this.tableWrap.innerHTML = `
                <div class="sources-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" stroke-width="1.5"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                    <p>${this.paths.length === 0 ? 'No paths configured. Add streams from the Streams tab.' : 'No paths match your search.'}</p>
                </div>
            `;
            return;
        }

        const table = document.createElement("table");
        table.className = "sources-table";
        table.innerHTML = `
            <thead>
                <tr>
                    <th class="col-status"></th>
                    <th class="col-name">Path</th>
                    <th class="col-source">Source</th>
                    <th class="col-type">Type</th>
                    <th class="col-tracks">Tracks</th>
                    <th class="col-viewers">Viewers</th>
                    <th class="col-bytes">Received</th>
                    <th class="col-bytes">Sent</th>
                    <th class="col-actions"></th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        for (const p of filtered) {
            const tr = document.createElement("tr");
            const protocolClass = this.getProtocolClass(p.sourceType || p.source?.type);
            const ready = p.ready === true;
            const viewers = p.readers?.length || 0;
            const tracks = (Array.isArray(p.tracks) ? p.tracks : []).map(t =>
                typeof t === 'string' ? t : (t.codec || t.type || '?')
            );
            const sourceId = (typeof p.source === 'object' && p.source !== null)
                ? (p.source.id || p.source.type || JSON.stringify(p.source))
                : (p.source || '—');
            const sourceTypeLabel = this.splitCamelCase(p.sourceType || p.source?.type || '').toUpperCase() || '—';

            tr.innerHTML = `
                <td class="col-status">
                    <span class="status-dot ${ready ? 'on' : 'off'}"></span>
                </td>
                <td class="col-name">${this.escapeHtml(p.name)}</td>
                <td class="col-source"><span class="src-text" title="${this.escapeHtml(sourceId)}">${this.escapeHtml(sourceId)}</span></td>
                <td class="col-type"><span class="proto-badge ${protocolClass}">${sourceTypeLabel}</span></td>
                <td class="col-tracks">${tracks.length > 0 ? this.escapeHtml(tracks.join(', ')) : '<span class="muted">—</span>'}</td>
                <td class="col-viewers"><span class="viewers-num">${viewers}</span></td>
                <td class="col-bytes">${this.formatBytes(parseInt(p.bytesReceived) || 0)}</td>
                <td class="col-bytes">${this.formatBytes(parseInt(p.bytesSent) || 0)}</td>
                <td class="col-actions">
                    <button class="src-view-btn" title="Open in Stream Viewer" ${!ready ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </button>
                </td>
            `;

            const viewBtn = tr.querySelector('.src-view-btn');
            viewBtn.addEventListener('click', () => {
                if (!ready) return;
                this.page.viewerHint = { stream: p.name, server: 'mediamtx' };
                this.page.tabNavigation.selected = 'streamviewer';
            });

            tbody.append(tr);
        }

        this.tableWrap.append(table);
    }

    escapeHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    async refresh() {
        await this.loadPaths();
        this.renderTable();
    }

    destroy() {
        clearInterval(this.pollingInterval);
        super.destroy();
    }
}
