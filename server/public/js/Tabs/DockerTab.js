import Tab from "./Tab.js";

export default class DockerTab extends Tab {
    constructor(page) {
        super(page);
        this.containers = [];
        this.expandedLogs = null;
        this.logFilter = 'all';
    }

    async render() {
        this.element = document.createElement("div");
        this.element.className = "tab docker";
        this.page.contentWrapper.append(this.element);

        await this.loadContainers();
        this.renderStats();
        this.renderTable();
    }

    async loadContainers() {
        try {
            const res = await this.fm.fetch('/api/docker/containers');
            if (res?.ok) {
                const data = await res.json();
                this.containers = data.containers || data || [];
                this.isMock = data.mock || false;
            }
        } catch (e) {
            this.containers = [];
        }
    }

    renderStats() {
        const total = this.containers.length;
        const running = this.containers.filter(c => c.State === 'running').length;
        const stopped = total - running;

        this.statsEl = document.createElement("div");
        this.statsEl.className = "docker-stats";

        const stats = [
            { label: 'Total Containers', value: total, color: 'var(--accent-info)' },
            { label: 'Running', value: running, color: 'var(--accent-success)' },
            { label: 'Stopped', value: stopped, color: 'var(--accent-danger)' },
            { label: 'Docker API', value: this.isMock ? 'Mock' : 'Live', color: this.isMock ? 'var(--accent-warning)' : 'var(--accent-success)' },
        ];

        stats.forEach(s => {
            const card = document.createElement("div");
            card.className = "docker-stat-card";
            card.innerHTML = `
                <div class="stat-value" style="color: ${s.color}">${s.value}</div>
                <div class="stat-label">${s.label}</div>
            `;
            this.statsEl.append(card);
        });

        this.element.append(this.statsEl);

        if (this.isMock) {
            const note = document.createElement("div");
            note.className = "hw-util-note";
            note.textContent = "Docker socket not available — showing mock data. Mount /var/run/docker.sock to enable live management.";
            this.element.append(note);
        }
    }

    renderTable() {
        this.tableWrap = document.createElement("div");
        this.tableWrap.className = "docker-table-wrap";

        const table = document.createElement("table");
        table.className = "docker-container-table";
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Image</th>
                    <th>State</th>
                    <th>Status</th>
                    <th>Ports</th>
                    <th>Actions</th>
                </tr>
            </thead>
        `;

        const tbody = document.createElement("tbody");

        this.containers.forEach(container => {
            const name = (container.Names?.[0] || container.name || '').replace(/^\//, '');
            const image = container.Image || '';
            const state = container.State || 'unknown';
            const status = container.Status || '';
            const ports = this.formatPorts(container.Ports || []);
            const id = container.Id || container.id || name;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="docker-name">${name}</td>
                <td class="docker-image">${image}</td>
                <td><span class="docker-state-badge ${state}">${state}</span></td>
                <td class="docker-status">${status}</td>
                <td class="docker-ports">${ports}</td>
                <td class="docker-actions">
                    <button class="phase2-btn sm secondary" data-action="logs" data-id="${id}" data-name="${name}">Logs</button>
                    ${state === 'running'
                        ? `<button class="phase2-btn sm secondary" data-action="stop" data-id="${id}">Stop</button>`
                        : `<button class="phase2-btn sm primary" data-action="start" data-id="${id}">Start</button>`
                    }
                    <button class="phase2-btn sm secondary" data-action="restart" data-id="${id}">Restart</button>
                </td>
            `;

            tr.querySelectorAll('button[data-action]').forEach(btn => {
                btn.addEventListener('click', () => this.handleAction(btn.dataset.action, btn.dataset.id, btn.dataset.name));
            });

            tbody.append(tr);
        });

        table.append(tbody);
        this.tableWrap.append(table);
        this.element.append(this.tableWrap);

        this.logPanelEl = document.createElement("div");
        this.logPanelEl.className = "docker-log-panel";
        this.logPanelEl.style.display = 'none';
        this.element.append(this.logPanelEl);
    }

    formatPorts(ports) {
        if (typeof ports === 'string') return ports;
        if (!Array.isArray(ports) || ports.length === 0) return '—';
        return ports.map(p => {
            if (p.PublicPort) return `${p.PublicPort}→${p.PrivatePort}/${p.Type || 'tcp'}`;
            return `${p.PrivatePort}/${p.Type || 'tcp'}`;
        }).join(', ');
    }

    async handleAction(action, id, name) {
        if (action === 'logs') {
            await this.showLogs(id, name);
            return;
        }

        try {
            const res = await this.fm.fetch(`/api/docker/containers/${id}/${action}`, { method: 'POST' });
            if (res?.ok) {
                this.page.toast.success(`Container ${action} successful`);
                setTimeout(() => this.refresh(), 1000);
            } else {
                this.page.toast.error(`Failed to ${action} container`);
            }
        } catch (e) {
            this.page.toast.error(`Error: ${e.message}`);
        }
    }

    async showLogs(id, name) {
        if (this.expandedLogs === id) {
            this.logPanelEl.style.display = 'none';
            this.expandedLogs = null;
            return;
        }

        this.expandedLogs = id;
        this.logPanelEl.style.display = 'block';
        this.logPanelEl.innerHTML = `<div class="docker-log-header">
            <span class="docker-log-title">Logs: ${name || id}</span>
            <div class="docker-log-filters">
                <button class="phase2-btn sm ${this.logFilter === 'all' ? 'primary' : 'secondary'}" data-level="all">All</button>
                <button class="phase2-btn sm ${this.logFilter === 'info' ? 'primary' : 'secondary'}" data-level="info">Info</button>
                <button class="phase2-btn sm ${this.logFilter === 'warn' ? 'primary' : 'secondary'}" data-level="warn">Warn</button>
                <button class="phase2-btn sm ${this.logFilter === 'error' ? 'primary' : 'secondary'}" data-level="error">Error</button>
            </div>
            <button class="phase2-btn sm secondary" id="docker-log-close">Close</button>
        </div>
        <div class="docker-log-body"></div>`;

        this.logPanelEl.querySelector('#docker-log-close').addEventListener('click', () => {
            this.logPanelEl.style.display = 'none';
            this.expandedLogs = null;
        });

        this.logPanelEl.querySelectorAll('.docker-log-filters button').forEach(btn => {
            btn.addEventListener('click', () => {
                this.logFilter = btn.dataset.level;
                this.logPanelEl.querySelectorAll('.docker-log-filters button').forEach(b => {
                    b.className = `phase2-btn sm ${b.dataset.level === this.logFilter ? 'primary' : 'secondary'}`;
                });
                this.filterLogs();
            });
        });

        try {
            const res = await this.fm.fetch(`/api/docker/containers/${id}/logs`);
            if (res?.ok) {
                const data = await res.json();
                this.logLines = data.logs || data || [];
                this.renderLogLines();
            }
        } catch (e) {
            this.logPanelEl.querySelector('.docker-log-body').textContent = 'Failed to load logs';
        }
    }

    renderLogLines() {
        const body = this.logPanelEl.querySelector('.docker-log-body');
        if (!body) return;
        body.innerHTML = '';

        const lines = Array.isArray(this.logLines) ? this.logLines : this.logLines.split?.('\n') || [];

        lines.forEach(line => {
            const text = typeof line === 'string' ? line : JSON.stringify(line);
            if (!text.trim()) return;

            const level = this.detectLevel(text);
            const el = document.createElement("div");
            el.className = `docker-log-line level-${level}`;
            el.dataset.level = level;
            el.textContent = text;
            body.append(el);
        });

        this.filterLogs();
        body.scrollTop = body.scrollHeight;
    }

    filterLogs() {
        const lines = this.logPanelEl?.querySelectorAll('.docker-log-line') || [];
        lines.forEach(line => {
            if (this.logFilter === 'all') {
                line.style.display = '';
            } else {
                line.style.display = line.dataset.level === this.logFilter ? '' : 'none';
            }
        });
    }

    detectLevel(text) {
        const lower = text.toLowerCase();
        if (lower.includes('error') || lower.includes('fatal') || lower.includes('panic')) return 'error';
        if (lower.includes('warn')) return 'warn';
        return 'info';
    }

    async refresh() {
        this.element.innerHTML = '';
        await this.loadContainers();
        this.renderStats();
        this.renderTable();
    }

    destroy() {
        super.destroy();
    }
}
