import Tab from "./Tab.js";
import DataProxy from "../data_proxy.js";
import StreamItem from "../Components/Overview/stream.js";

export default class OverviewTab extends Tab {
    constructor(page) {
        super(page);
        this.baseUrl = '/mediamtx';
        this.pathsListUrl = `${this.baseUrl}/paths/list`;
        this.items = new DataProxy({}, this, false);
        this.pollingDelay = 500; //ms
        this.layout = localStorage.getItem('overview:layout') || '2x2';
        this._modal = null;
    }

    async render() {
        // the box
        this.element = document.createElement("div");
        this.element.className = "tab overview";
        this.page.contentWrapper.append(this.element);

        this.renderToolbar();

        this.pathsEl = document.createElement("div");
        this.pathsEl.classList.add('streams');
        this.pathsEl.setAttribute('data-layout', this.layout);
        this.element.append(this.pathsEl);

        this.openRequests = 0;
        await this.load();
    }

    renderToolbar() {
        this.toolbar = document.createElement("div");
        this.toolbar.className = "overview-toolbar";

        // Layout group
        const layoutGroup = document.createElement("div");
        layoutGroup.className = "overview-layout-group";

        ['2x1', '2x2', '3x2', '3x3'].forEach(l => {
            const btn = document.createElement("button");
            btn.className = `overview-layout-btn${l === this.layout ? ' active' : ''}`;
            btn.setAttribute('data-layout', l);
            btn.textContent = l.replace('x', '×');
            btn.addEventListener('click', () => {
                this.layout = l;
                localStorage.setItem('overview:layout', l);
                layoutGroup.querySelectorAll('.overview-layout-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.pathsEl.setAttribute('data-layout', l);
            });
            layoutGroup.append(btn);
        });

        this.toolbar.append(layoutGroup);

        // Right group
        const rightGroup = document.createElement("div");
        rightGroup.className = "overview-toolbar-right";

        this.streamCountEl = document.createElement("span");
        this.streamCountEl.className = "overview-stream-count";
        this.streamCountEl.textContent = '0 streams';
        rightGroup.append(this.streamCountEl);

        const fullscreenAllBtn = document.createElement("button");
        fullscreenAllBtn.className = "overview-fullscreen-all";
        fullscreenAllBtn.title = "Fullscreen all";
        fullscreenAllBtn.textContent = '⛶';
        rightGroup.append(fullscreenAllBtn);

        this.toolbar.append(rightGroup);
        this.element.append(this.toolbar);
    }

    renderPathItem(name) {
        const element = this.items[name].render();
        // Attach fullscreen click handler
        element.addEventListener('click', () => {
            this.openFullscreenModal(this.items[name].data);
        });
        this.pathsEl.append(element);
    }

    async load() {
        await this.loadPathsList();
        this.poll();
    }

    async loadPathsList() {
        const res = await this.fm.fetch(this.pathsListUrl);

        if (!res)
            return false;

        const text = await res.text();
        const data = await JSON.parse(text);

        if (!data.items)
            return;

        this.syncData(data.items);
        return true;
    }

    syncData(items) {
        // drop missing items
        const dropped = this.items.keys().filter(a => !items.map(i => i.confName).includes(a));
        dropped.forEach(i => {
            this.items[i].destroy();
            delete this.items[i];
        });

        // create or update (patch)
        if (items.length > 0) {
            items.forEach(i => {
                if (!this.items[i.confName]) {
                    this.items[i.confName] = new StreamItem(i, this);
                } else {
                    if(typeof this.items[i.confName].update === 'function') {
                        this.items[i.confName].update(i);
                    }
                }
            });
        }

        // Update stream count
        if (this.streamCountEl) {
            const count = items.length;
            this.streamCountEl.textContent = `${count} stream${count !== 1 ? 's' : ''}`;
        }

        // Update modal meta if open
        if (this._modal && this._modal._streamName) {
            const name = this._modal._streamName;
            const updated = items.find(i => i.confName === name);
            if (updated) this._modal._updateMeta(updated);
        }
    }

    poll() {
        clearInterval(this.cycle);
        this.cycle = setInterval(() => this.loadPathsList(), this.pollingDelay);
    }

    action(action, prop, value) {
        console.log(this.label, action, prop, value);

        if (action === 'create')
            this.renderPathItem(prop);
    }

    // ------------------------------------------------------------------ modal

    getHlsUrl(name) {
        const url = new URL(window.location.href);
        const hlsAddr = this.settings?.hls?.hlsAddress || ':8888';
        return `${url.protocol}//${url.hostname}${hlsAddr}/${name}/index.m3u8`;
    }

    splitCamelCase(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    }

    openFullscreenModal(streamData) {
        // Close any existing modal first
        if (this._modal) {
            this._modal._close();
        }

        const modal = document.createElement("div");
        modal.className = "overview-fullscreen-modal";

        const backdrop = document.createElement("div");
        backdrop.className = "overview-modal-backdrop";
        modal.append(backdrop);

        const content = document.createElement("div");
        content.className = "overview-modal-content";

        // Video wrap
        const videoWrap = document.createElement("div");
        videoWrap.className = "overview-modal-video-wrap";
        const video = document.createElement("video");
        video.autoplay = true;
        video.muted = true;
        video.setAttribute('muted', '');
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        videoWrap.append(video);
        content.append(videoWrap);

        // Info panel
        const info = document.createElement("div");
        info.className = "overview-modal-info";

        const title = document.createElement("h3");
        title.textContent = streamData.confName;
        info.append(title);

        const meta = document.createElement("div");
        meta.className = "overview-modal-meta";

        const makeRow = (label, value) => {
            const row = document.createElement("div");
            row.className = "overview-modal-row";
            row.innerHTML = `<span class="label">${label}</span><span class="value">${value}</span>`;
            return row;
        };

        const sourceType = streamData.source?.type || '';
        const readers = streamData.readers?.length || 0;
        const bytesRx = ((parseInt(streamData.bytesReceived) || 0) / 1048576).toFixed(2);
        const bytesTx = ((parseInt(streamData.bytesSent) || 0) / 1048576).toFixed(2);

        const rowProtocol = makeRow('Protocol', this.splitCamelCase(sourceType).toUpperCase() || '—');
        const rowViewers  = makeRow('Viewers', readers);
        const rowRx       = makeRow('Bytes Received', `${bytesRx} MB`);
        const rowTx       = makeRow('Bytes Sent', `${bytesTx} MB`);

        meta.append(rowProtocol, rowViewers, rowRx, rowTx);
        info.append(meta);
        content.append(info);

        // Close button
        const closeBtn = document.createElement("button");
        closeBtn.className = "overview-modal-close";
        closeBtn.textContent = '✕';
        content.append(closeBtn);

        modal.append(content);
        document.body.append(modal);

        // HLS playback
        let hls = null;
        if (typeof Hls !== 'undefined') {
            hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                maxBufferLength: 5,
                backBufferLength: 10,
            });
            hls.attachMedia(video);
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                hls.loadSource(this.getHlsUrl(streamData.confName));
            });
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(() => {});
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    setTimeout(() => { hls.loadSource(this.getHlsUrl(streamData.confName)); hls.startLoad(); }, 3000);
                }
                if (data.fatal && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    hls.recoverMediaError();
                }
            });
        }

        const close = () => {
            if (hls) hls.destroy();
            modal.remove();
            this._modal = null;
            document.removeEventListener('keydown', keyHandler);
        };

        const keyHandler = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', keyHandler);
        backdrop.addEventListener('click', close);
        closeBtn.addEventListener('click', close);

        // Live meta update helper
        modal._streamName = streamData.confName;
        modal._updateMeta = (d) => {
            const rd = d.readers?.length || 0;
            const rx = ((parseInt(d.bytesReceived) || 0) / 1048576).toFixed(2);
            const tx = ((parseInt(d.bytesSent) || 0) / 1048576).toFixed(2);
            rowViewers.querySelector('.value').textContent = rd;
            rowRx.querySelector('.value').textContent = `${rx} MB`;
            rowTx.querySelector('.value').textContent = `${tx} MB`;
        };
        modal._close = close;

        this._modal = modal;
    }

    // -----------------------------------------------------------------------

    destroy() {
        super.destroy();
        clearInterval(this.cycle);
        if (this._modal) this._modal._close();
        this.items.keys().forEach(i => {
            this.items[i].destroy();
            delete this.items[i]
        });
        this.element ? this.element.remove() : null;
    }

    get settings() {
        return this.page.settings;
    }

    set settings(value) {
        // do nothing
    }
}
