import Tab from "./Tab.js";

export default class Go2RTCSourcesTab extends Tab {
    constructor(page) {
        super(page);
        this.streams = [];
        this.search = '';
        this.pollingInterval = null;
        this.dialogOpen = false;
        this.editing = null;
    }

    async render() {
        this.element = document.createElement("div");
        this.element.className = "tab go2rtc-tab";
        this.page.contentWrapper.append(this.element);

        this.renderHeader();
        this.renderFilters();
        this.tableWrap = document.createElement("div");
        this.tableWrap.className = "sources-table-wrap";
        this.element.append(this.tableWrap);

        await this.loadStreams();
        this.renderTable();
        this.pollingInterval = setInterval(() => this.loadStreams().then(() => this.renderTable()), 5000);
    }

    renderHeader() {
        const header = document.createElement("div");
        header.className = "sources-header";
        header.innerHTML = `
            <div class="sources-header-left">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                <div>
                    <h2 class="sources-title">Go2RTC Sources</h2>
                    <p class="sources-subtitle">Manage Go2RTC streams — RTSP, WebRTC, snapshots</p>
                </div>
            </div>
            <div class="sources-header-right">
                <span class="sources-count-badge">0 streams</span>
                <button class="phase2-btn sm secondary sources-refresh-btn">Refresh</button>
                <button class="phase2-btn sm sources-add-btn">+ Add Stream</button>
            </div>
        `;
        header.querySelector('.sources-refresh-btn').addEventListener('click', () => this.refresh());
        header.querySelector('.sources-add-btn').addEventListener('click', () => this.openDialog());
        this.countBadge = header.querySelector('.sources-count-badge');
        this.element.append(header);
    }

    renderFilters() {
        const bar = document.createElement("div");
        bar.className = "sources-filter-bar";
        bar.innerHTML = `
            <div class="sources-search-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" class="sources-search" placeholder="Search streams..." />
            </div>
        `;
        bar.querySelector('.sources-search').addEventListener('input', (e) => {
            this.search = e.target.value.toLowerCase();
            this.renderTable();
        });
        this.element.append(bar);
    }

    async loadStreams() {
        try {
            const res = await this.fm.fetch('/go2rtc/api/streams');
            if (!res || !res.ok) throw new Error('failed');
            const data = await res.json();
            const arr = Array.isArray(data) ? data : Object.entries(data).map(([name, info]) => ({
                name,
                src: info?.producers?.[0]?.url || info?.src || '',
                ready: !!(info?.consumers?.length || info?.producers?.length),
                info: info,
            }));
            this.streams = arr;
            this.isMock = false;
        } catch (e) {
            this.streams = this.getMockStreams();
            this.isMock = true;
        }
        if (this.countBadge) {
            this.countBadge.innerHTML = `${this.streams.length} stream${this.streams.length !== 1 ? 's' : ''}${this.isMock ? ' <span class="sources-mock-badge">MOCK</span>' : ''}`;
        }
    }

    getMockStreams() {
        return [
            { name: 'cam-front-door', src: 'rtsp://admin:pass@192.168.1.50:554/h264', url: '/go2rtc/api/webrtc?src=cam-front-door', ready: true },
            { name: 'cam-backyard', src: 'rtsp://admin:pass@192.168.1.51:554/h264', url: '/go2rtc/api/webrtc?src=cam-backyard', ready: true },
            { name: 'cam-garage', src: 'rtsp://admin:pass@192.168.1.52:554/h264', url: '/go2rtc/api/webrtc?src=cam-garage', ready: false },
            { name: 'cam-driveway', src: 'rtsp://admin:pass@192.168.1.53:554/h264', url: '/go2rtc/api/webrtc?src=cam-driveway', ready: false },
        ];
    }

    detectType(src) {
        if (!src) return '';
        const s = src.toLowerCase();
        if (s.startsWith('rtsp')) return 'rtsp';
        if (s.startsWith('rtmp')) return 'rtmp';
        if (s.startsWith('http') && s.includes('m3u8')) return 'hls';
        if (s.startsWith('http')) return 'http';
        if (s.startsWith('webrtc') || s.startsWith('whep')) return 'webrtc';
        if (s.startsWith('srt')) return 'srt';
        if (s.startsWith('ffmpeg')) return 'ffmpeg';
        if (s.startsWith('exec')) return 'exec';
        return 'other';
    }

    getFiltered() {
        if (!this.search) return this.streams;
        return this.streams.filter(s => s.name.toLowerCase().includes(this.search) || (s.src || '').toLowerCase().includes(this.search));
    }

    renderTable() {
        const filtered = this.getFiltered();
        this.tableWrap.innerHTML = '';

        if (filtered.length === 0) {
            this.tableWrap.innerHTML = `
                <div class="sources-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" stroke-width="1.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    <p>${this.streams.length === 0 ? 'No Go2RTC streams configured. Click "Add Stream" to create one.' : 'No streams match your search.'}</p>
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
                    <th class="col-name">Name</th>
                    <th class="col-source">Source</th>
                    <th class="col-type">Type</th>
                    <th class="col-actions"></th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        for (const s of filtered) {
            const tr = document.createElement("tr");
            const type = this.detectType(s.src);
            tr.innerHTML = `
                <td class="col-status"><span class="status-dot ${s.ready ? 'on' : 'off'}"></span></td>
                <td class="col-name">${this.escapeHtml(s.name)}</td>
                <td class="col-source"><span class="src-text" title="${this.escapeHtml(s.src)}">${this.escapeHtml(s.src)}</span></td>
                <td class="col-type"><span class="proto-badge protocol-${type}">${type.toUpperCase()}</span></td>
                <td class="col-actions">
                    <button class="src-action-btn src-edit-btn" title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="src-action-btn src-del-btn" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </td>
            `;
            tr.querySelector('.src-edit-btn').addEventListener('click', () => this.openDialog(s));
            tr.querySelector('.src-del-btn').addEventListener('click', () => this.handleDelete(s));
            tbody.append(tr);
        }
        this.tableWrap.append(table);
    }

    openDialog(stream = null) {
        this.editing = stream;
        const modal = document.createElement("div");
        modal.className = "sources-dialog";
        modal.innerHTML = `
            <div class="sources-dialog-backdrop"></div>
            <div class="sources-dialog-content">
                <h3>${stream ? 'Edit Stream' : 'Add Go2RTC Stream'}</h3>
                <div class="sources-form-row">
                    <label>Name</label>
                    <input type="text" class="dlg-name" value="${stream ? this.escapeHtml(stream.name) : ''}" ${stream ? 'disabled' : ''} placeholder="cam-front-door" />
                </div>
                <div class="sources-form-row">
                    <label>Source URL</label>
                    <input type="text" class="dlg-src" value="${stream ? this.escapeHtml(stream.src) : ''}" placeholder="rtsp://user:pass@host:554/path" />
                </div>
                <div class="sources-dialog-actions">
                    <button class="phase2-btn sm secondary dlg-cancel">Cancel</button>
                    <button class="phase2-btn sm dlg-save">${stream ? 'Save' : 'Create'}</button>
                </div>
            </div>
        `;
        document.body.append(modal);
        this.activeModal = modal;

        const close = () => { modal.remove(); this.activeModal = null; this.editing = null; };
        modal.querySelector('.sources-dialog-backdrop').addEventListener('click', close);
        modal.querySelector('.dlg-cancel').addEventListener('click', close);
        modal.querySelector('.dlg-save').addEventListener('click', async () => {
            const name = modal.querySelector('.dlg-name').value.trim();
            const src = modal.querySelector('.dlg-src').value.trim();
            if (!name || !src) {
                this.page.toast?.error('Name and source are required');
                return;
            }
            await this.handleSave(name, src, !!stream);
            close();
        });
    }

    async handleSave(name, src, isEdit) {
        try {
            const url = `/go2rtc/api/streams?src=${encodeURIComponent(name)}`;
            const res = await this.fm.fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'text/plain' },
                body: src,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            this.page.toast?.success(isEdit ? 'Stream updated' : 'Stream created');
            await this.refresh();
        } catch (e) {
            this.page.toast?.error(`Failed to save: ${e.message}`);
        }
    }

    async handleDelete(stream) {
        if (!confirm(`Delete stream "${stream.name}"?`)) return;
        try {
            const res = await this.fm.fetch(`/go2rtc/api/streams?src=${encodeURIComponent(stream.name)}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            this.page.toast?.success('Stream deleted');
            await this.refresh();
        } catch (e) {
            this.page.toast?.error(`Failed to delete: ${e.message}`);
        }
    }

    escapeHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    async refresh() {
        await this.loadStreams();
        this.renderTable();
    }

    destroy() {
        clearInterval(this.pollingInterval);
        this.activeModal?.remove();
        super.destroy();
    }
}
