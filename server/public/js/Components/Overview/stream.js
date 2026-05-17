import DataProxy from "../../data_proxy.js";
import Video from "../../video.js";

export default class StreamItem {
    constructor(data, tab) {
        this.label = this.constructor.name.toUpperCase();
        this.tab = tab;
        this.page = this.tab.page;
        this.data = new DataProxy(data, this, false);
    }

    render() {
        if (this.element)
            this.destroy();

        const el = document.createElement("div");
        el.className = 'stream-item';

        const sourceType = this.data.source ? this.data.source.type : '';
        const protocolClass = this.getProtocolClass(sourceType);
        if (protocolClass) el.classList.add(protocolClass);

        //--- top-left overlay: status dot + stream name
        const overlayTop = document.createElement("div");
        overlayTop.className = 'stream-overlay-top';

        const statusDot = document.createElement("div");
        statusDot.className = 'stream-status-dot';
        overlayTop.append(statusDot);

        const nameEl = document.createElement("div");
        nameEl.className = 'stream-name';
        nameEl.textContent = this.data.confName;
        overlayTop.append(nameEl);

        el.append(overlayTop);

        //--- top-right overlay: protocol badge
        this.typeEl = document.createElement("div");
        this.typeEl.className = 'stream-type';
        if (protocolClass) this.typeEl.classList.add(protocolClass);
        const typeText = this.data.source && this.data.source.type
            ? splitCamelCase(this.data.source.type).toUpperCase()
            : '';
        this.typeEl.textContent = typeText;
        el.append(this.typeEl);

        //--- video element
        this.video = new Video(this);
        el.append(this.video.render());
        requestAnimationFrame(() => this.video.init());

        //--- bottom overlay: viewers + bytes
        const overlayBottom = document.createElement("div");
        overlayBottom.className = 'stream-overlay-bottom';

        // viewers
        const viewersEl = document.createElement("div");
        viewersEl.className = 'stream-viewers';

        const eyeIcon = this.page.icons?.svg?.['eye'] || '';
        const eyeSpan = document.createElement("span");
        eyeSpan.className = 'stream-viewers-icon';
        eyeSpan.innerHTML = eyeIcon;
        viewersEl.append(eyeSpan);

        this.viewersNumberEl = document.createElement("div");
        this.viewersNumberEl.className = 'stream-viewers-number';
        this.viewersNumberEl.textContent = this.data.readers.length;
        viewersEl.append(this.viewersNumberEl);

        overlayBottom.append(viewersEl);

        // bytes
        const bytesEl = document.createElement("div");
        bytesEl.className = 'stream-bytes';

        const bytesReceivedEl = document.createElement("div");
        bytesReceivedEl.className = 'stream-bytes-received';
        this.bytesReceivedNumberEl = document.createElement("span");
        this.bytesReceivedNumberEl.className = 'stream-bytes-received-number';
        this.bytesReceivedNumberEl.textContent = (parseInt(this.data.bytesReceived) / 1048576).toFixed(1);
        bytesReceivedEl.append(this.bytesReceivedNumberEl);
        bytesEl.append(bytesReceivedEl);

        const bytesSentEl = document.createElement("div");
        bytesSentEl.className = 'stream-bytes-sent';
        this.bytesSentNumberEl = document.createElement("span");
        this.bytesSentNumberEl.className = 'stream-bytes-sent-number';
        this.bytesSentNumberEl.textContent = (parseInt(this.data.bytesSent) / 1048576).toFixed(1);
        bytesSentEl.append(this.bytesSentNumberEl);
        bytesEl.append(bytesSentEl);

        overlayBottom.append(bytesEl);
        el.append(overlayBottom);

        return this.element = el;
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

    update(data) {
        Object.keys(data).forEach((key) => this.data[key] = data[key]);
    }

    action(action, prop, value) {
        if (action === 'update') {
            if (prop === 'readers')
                this.viewers = value.length;

            if (prop === 'bytesReceived')
                this.bytesReceived = value;

            if (prop === 'bytesSent')
                this.bytesSent = value;

            if (prop === 'type' || prop === 'tracks') {
                if (this.data.source) {
                    this.typeEl.textContent = splitCamelCase(this.data.source.type).toUpperCase();
                    const newProtocol = this.getProtocolClass(this.data.source.type);
                    ['protocol-rtsp', 'protocol-hls', 'protocol-webrtc', 'protocol-rtmp', 'protocol-srt'].forEach(cls => {
                        this.element.classList.remove(cls);
                        this.typeEl.classList.remove(cls);
                    });
                    if (newProtocol) {
                        this.element.classList.add(newProtocol);
                        this.typeEl.classList.add(newProtocol);
                    }
                }
            }
        }
    }

    destroy() {
        this.video.destroy();
        this.element.remove();
    }

    get viewers() {
        return this._viewers;
    }

    set viewers(value) {
        this._viewers = value;
        this.viewersNumberEl.textContent = this.viewers;
    }

    get bytesReceived() {
        return this._bytesReceived;
    }

    set bytesReceived(value) {
        this._bytesReceived = value;
        this.bytesReceivedNumberEl.textContent = (parseInt(this.bytesReceived) / 1048576).toFixed(1);
    }

    get bytesSent() {
        return this._bytesSent;
    }

    set bytesSent(value) {
        this._bytesSent = value;
        this.bytesSentNumberEl.textContent = (parseInt(this.bytesSent) / 1048576).toFixed(1);
    }

}

const splitCamelCase = (str) => {
    return str
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}
