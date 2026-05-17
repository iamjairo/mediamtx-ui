import Tab from "./Tab.js";

export default class LogsTab extends Tab {
    constructor(page) {
        super(page);
        this.logs = [];
        this.filter = '';
        this.levelFilter = 'ALL';
        this.pollingInterval = null;
    }

    async render() {
        this.element = document.createElement("div");
        this.element.className = "tab logs-tab";
        this.page.contentWrapper.append(this.element);

        this.renderHeader();
        this.renderFilters();
        this.logPanel = document.createElement("div");
        this.logPanel.className = "logs-panel";
        this.element.append(this.logPanel);

        await this.loadLogs();
        this.renderLogs();
        this.pollingInterval = setInterval(() => this.loadLogs().then(() => this.renderLogs()), 5000);
    }

    renderHeader() {
        const header = document.createElement("div");
        header.className = "logs-header";
        header.innerHTML = `
            <div class="logs-header-left">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                <div>
                    <h2 class="logs-title">System Logs</h2>
                    <p class="logs-subtitle">Real-time log viewer with severity filtering</p>
                </div>
            </div>
            <div class="logs-header-right">
                <button class="phase2-btn sm secondary logs-clear-btn">Clear</button>
                <button class="phase2-btn sm secondary logs-refresh-btn">Refresh</button>
            </div>
        `;
        header.querySelector('.logs-refresh-btn').addEventListener('click', () => this.refresh());
        header.querySelector('.logs-clear-btn').addEventListener('click', () => {
            this.logs = [];
            this.renderLogs();
        });
        this.element.append(header);
    }

    renderFilters() {
        const bar = document.createElement("div");
        bar.className = "logs-filter-bar";

        const searchWrap = document.createElement("div");
        searchWrap.className = "logs-search-wrap";
        searchWrap.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="logs-search" placeholder="Filter logs..." />
        `;
        searchWrap.querySelector('.logs-search').addEventListener('input', (e) => {
            this.filter = e.target.value.toLowerCase();
            this.renderLogs();
        });
        bar.append(searchWrap);

        this.levelBtnsWrap = document.createElement("div");
        this.levelBtnsWrap.className = "logs-level-btns";
        bar.append(this.levelBtnsWrap);

        this.element.append(bar);
    }

    renderLevelButtons() {
        const levels = ['ALL', ...new Set(this.logs.map(l => l.level))];
        this.levelBtnsWrap.innerHTML = '';
        for (const lvl of levels) {
            const btn = document.createElement("button");
            btn.className = `logs-level-btn ${lvl === this.levelFilter ? 'active' : ''} logs-level-${lvl.toLowerCase()}`;
            btn.textContent = lvl;
            btn.addEventListener('click', () => {
                this.levelFilter = lvl;
                this.renderLevelButtons();
                this.renderLogs();
            });
            this.levelBtnsWrap.append(btn);
        }
    }

    async loadLogs() {
        try {
            const res = await this.fm.fetch('/mediamtx/logs');
            if (!res) return;
            const data = await res.json();
            this.logs = Array.isArray(data) ? data : (data.items || data.logs || []);
        } catch (e) {
            if (this.logs.length === 0) {
                this.logs = this.getMockLogs();
            }
        }
        this.renderLevelButtons();
    }

    getMockLogs() {
        const now = new Date();
        const t = (minAgo) => new Date(now.getTime() - minAgo * 60000).toISOString();
        return [
            { time: t(0), level: 'INFO', source: 'mediamtx', message: 'MediaMTX v1.11.0' },
            { time: t(1), level: 'INFO', source: 'mediamtx', message: 'RTSP listener opened on :8554 (TCP), :8000 (UDP/RTP), :8001 (UDP/RTCP)' },
            { time: t(1), level: 'INFO', source: 'mediamtx', message: 'HLS listener opened on :8888' },
            { time: t(1), level: 'INFO', source: 'mediamtx', message: 'WebRTC listener opened on :8889 (HTTP)' },
            { time: t(2), level: 'WARN', source: 'mediamtx', message: 'path cam/front-door: source not ready yet, stream will start when publisher connects' },
            { time: t(3), level: 'INFO', source: 'go2rtc', message: 'Go2RTC v1.9.4 started' },
            { time: t(4), level: 'INFO', source: 'go2rtc', message: 'Stream cam/backyard: connected via RTSP' },
            { time: t(5), level: 'ERROR', source: 'mediamtx', message: 'path cam/garage: connection refused: RTSP source timeout after 10s' },
            { time: t(7), level: 'DEBUG', source: 'go2rtc', message: 'WebRTC peer connected: 192.168.1.42' },
            { time: t(10), level: 'WARN', source: 'mediamtx', message: 'High memory usage detected: 85% of available RAM' },
        ];
    }

    getFilteredLogs() {
        return this.logs.filter(l => {
            if (this.levelFilter !== 'ALL' && l.level !== this.levelFilter) return false;
            if (this.filter && !l.message.toLowerCase().includes(this.filter) && !l.source.toLowerCase().includes(this.filter)) return false;
            return true;
        });
    }

    renderLogs() {
        const filtered = this.getFilteredLogs();
        this.logPanel.innerHTML = '';

        if (filtered.length === 0) {
            this.logPanel.innerHTML = `
                <div class="logs-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" stroke-width="1.5"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                    <p>No logs match your filters</p>
                </div>
            `;
            return;
        }

        for (const log of filtered) {
            const row = document.createElement("div");
            row.className = "logs-row";

            const time = new Date(log.time);
            const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

            const levelClass = `logs-badge-${(log.level || 'info').toLowerCase()}`;

            row.innerHTML = `
                <span class="logs-time">${timeStr}</span>
                <span class="logs-badge ${levelClass}">${log.level}</span>
                <span class="logs-source">[${log.source}]</span>
                <span class="logs-message">${this.escapeHtml(log.message)}</span>
            `;
            this.logPanel.append(row);
        }

        this.logPanel.scrollTop = this.logPanel.scrollHeight;
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    async refresh() {
        await this.loadLogs();
        this.renderLogs();
    }

    destroy() {
        clearInterval(this.pollingInterval);
        super.destroy();
    }
}
