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

        const label = (textContent) => {
            const element = document.createElement("div");
            element.className = 'stream-label';
            element.textContent = textContent;
            return element;
        };

        const el = document.createElement("div");
        el.className = 'stream-item';

        // Determine source type for protocol-specific styling
        const sourceType = this.data.source ? this.data.source.type : '';
        const protocolClass = this.getProtocolClass(sourceType);
        if (protocolClass) el.classList.add(protocolClass);

        // Live status indicator
        el.classList.add('status-live');

        //--- header with name + type badge
        const headerEl = document.createElement("div");
        headerEl.className = 'stream-header';

        const headerLeft = document.createElement("div");
        headerLeft.className = 'stream-header-left';

        const nameEl = document.createElement("div");
        nameEl.className = 'stream-name';
        nameEl.textContent = this.data.confName;
        headerLeft.append(nameEl);

        //--- type badge (protocol)
        this.typeEl = document.createElement("div");
        this.typeEl.className = 'stream-type';
        if (protocolClass) this.typeEl.classList.add(protocolClass);
        this.typeEl.textContent = this.data.source && this.data.tracks ? `${splitCamelCase(this.data.source.type).toUpperCase()} - ${this.data.tracks.join(', ')}` : '';
        headerLeft.append(this.typeEl);

        headerEl.append(headerLeft);

        //--- viewers with eye icon
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

        const labelViewersEl = label('watching');
        viewersEl.append(labelViewersEl);

        headerEl.append(viewersEl);
        el.append(headerEl);

        //--- video element
        this.video = new Video(this);
        el.append(this.video.render());
        requestAnimationFrame(() => this.video.init());

        //--- bytes footer
        const bytesEl = document.createElement("div");
        bytesEl.className = 'stream-bytes';

        //--- bytes received
        const bytesReceivedEl = document.createElement("div");
        bytesReceivedEl.className = 'stream-bytes-received';

        const labelBytesReceivedEl = label('Received');
        bytesReceivedEl.append(labelBytesReceivedEl);

        this.bytesReceivedNumberEl = document.createElement("div");
        this.bytesReceivedNumberEl.className = 'stream-bytes-received-number';
        this.bytesReceivedNumberEl.textContent = this.data.bytesReceived;
        bytesReceivedEl.append(this.bytesReceivedNumberEl);
        bytesEl.append(bytesReceivedEl);

        //--- bytes sent
        const bytesSentEl = document.createElement("div");
        bytesSentEl.className = 'stream-bytes-sent';

        const labelBytesSentEl = label('Sent');
        bytesSentEl.append(labelBytesSentEl);

        this.bytesSentNumberEl = document.createElement("div");
        this.bytesSentNumberEl.className = 'stream-bytes-sent-number';
        this.bytesSentNumberEl.textContent = this.data.bytesSent;
        bytesSentEl.append(this.bytesSentNumberEl);
        bytesEl.append(bytesSentEl);

        el.append(bytesEl);

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
                if (this.data.source && this.data.tracks.length > 0) {
                    this.typeEl.textContent = `${splitCamelCase(this.data.source.type).toUpperCase()} - ${this.data.tracks.join(', ')}`;
                    // Update protocol class on type badge and card
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
        this.bytesReceivedNumberEl.textContent = (parseInt(this.bytesReceived) / 1048576).toFixed(2);
    }

    get bytesSent() {
        return this._bytesSent;
    }

    set bytesSent(value) {
        this._bytesSent = value;
        this.bytesSentNumberEl.textContent = (parseInt(this.bytesSent) / 1048576).toFixed(2);
    }

}

const splitCamelCase = (str) => {
    return str
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}