import Tab from "./Tab.js";

export default class HardwareTab extends Tab {
    constructor(page) {
        super(page);
        this.accelerators = [
            { id: 'qsv', name: 'Intel QuickSync', desc: 'Hardware H.264/H.265 encode via QSV', device: '/dev/dri/renderD128', icon: 'cpu' },
            { id: 'vaapi', name: 'VAAPI (i965/iHD)', desc: 'Video Acceleration API via libva', device: '/dev/dri/renderD128', icon: 'cpu' },
            { id: 'onevpl', name: 'Intel oneVPL', desc: 'Next-gen media processing framework', device: 'GPU: 0', icon: 'cpu' },
            { id: 'gstreamer', name: 'GStreamer 1.24', desc: 'Pipeline-based media framework', device: 'system', icon: 'play' },
            { id: 'ffmpeg', name: 'FFmpeg 7.0', desc: 'General-purpose multimedia framework', device: 'system', icon: 'play' },
            { id: 'nvenc', name: 'NVIDIA CUDA', desc: 'NVENC/NVDEC hardware encoding', device: 'N/A', icon: 'cpu' },
        ];
        this.state = this.loadState();
    }

    loadState() {
        try {
            const saved = localStorage.getItem('hw:state');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return {
            enabled: true,
            fallbackCpu: true,
            accelerators: { qsv: true, vaapi: true, onevpl: false, gstreamer: true, ffmpeg: true, nvenc: false },
        };
    }

    saveState() {
        localStorage.setItem('hw:state', JSON.stringify(this.state));
    }

    async render() {
        this.element = document.createElement("div");
        this.element.className = "tab hardware";
        this.page.contentWrapper.append(this.element);

        this.renderGlobalSettings();
        this.renderGrid();
    }

    renderGlobalSettings() {
        const section = document.createElement("div");
        section.className = "hw-global-settings";
        section.innerHTML = `
            <div class="hw-global-row">
                ${this.toggleHTML('hw-enable', 'Enable Hardware Acceleration', 'Use GPU-based encoding/decoding when available', this.state.enabled)}
                ${this.toggleHTML('hw-fallback', 'Fallback to CPU', 'Automatically fall back to software encoding if hardware fails', this.state.fallbackCpu)}
            </div>
        `;
        this.element.append(section);

        section.querySelector('#hw-enable').addEventListener('change', (e) => {
            this.state.enabled = e.target.checked;
            this.saveState();
        });
        section.querySelector('#hw-fallback').addEventListener('change', (e) => {
            this.state.fallbackCpu = e.target.checked;
            this.saveState();
        });
    }

    renderGrid() {
        const grid = document.createElement("div");
        grid.className = "hw-grid";

        const detectCard = this.createDetectionCard();
        grid.append(detectCard);

        const utilCard = this.createUtilizationCard();
        grid.append(utilCard);

        this.element.append(grid);
    }

    createDetectionCard() {
        const card = document.createElement("div");
        card.className = "hw-card";
        card.innerHTML = `<h3>Accelerator Detection</h3>`;

        this.accelerators.forEach(acc => {
            const enabled = this.state.accelerators[acc.id] ?? false;
            const available = acc.id !== 'nvenc';

            const row = document.createElement("div");
            row.className = "hw-detector";
            row.innerHTML = `
                <div class="hw-detector-info">
                    <div class="hw-detector-name">${acc.name}</div>
                    <div class="hw-detector-desc">${acc.desc}</div>
                    <div class="hw-detector-device">${acc.device}</div>
                </div>
                <div class="hw-detector-right">
                    <span class="status-badge ${available ? 'available' : 'unavailable'}">${available ? 'Available' : 'Not Detected'}</span>
                    <label class="toggle-switch ${!available ? 'disabled' : ''}">
                        <input type="checkbox" id="acc-${acc.id}" ${enabled ? 'checked' : ''} ${!available ? 'disabled' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            `;
            card.append(row);

            const input = row.querySelector(`#acc-${acc.id}`);
            input.addEventListener('change', (e) => {
                this.state.accelerators[acc.id] = e.target.checked;
                this.saveState();
            });
        });

        return card;
    }

    createUtilizationCard() {
        const card = document.createElement("div");
        card.className = "hw-card";
        card.innerHTML = `
            <h3>GPU Utilization</h3>
            <div class="hw-utilization">
                <div class="hw-util-row">
                    <span class="hw-util-label">GPU Usage</span>
                    <span class="hw-util-value" id="hw-gpu-pct">—</span>
                    <div class="progress-bar"><div class="fill" id="hw-gpu-bar" style="width: 0%"></div></div>
                </div>
                <div class="hw-util-row">
                    <span class="hw-util-label">Video Memory</span>
                    <span class="hw-util-value" id="hw-mem-val">—</span>
                    <div class="progress-bar"><div class="fill" id="hw-mem-bar" style="width: 0%"></div></div>
                </div>
                <div class="hw-util-row">
                    <span class="hw-util-label">Transcode Sessions</span>
                    <span class="hw-util-value" id="hw-sessions-val">0 / 0</span>
                    <div class="progress-bar"><div class="fill" id="hw-sessions-bar" style="width: 0%"></div></div>
                </div>
            </div>
            <div class="hw-util-note">GPU metrics available when running in Docker with device passthrough</div>

            <h3 style="margin-top: var(--space-xl)">Transcoding Presets</h3>
            <div class="hw-presets">
                ${this.renderPreset('Low Latency', 'h264_qsv', 'veryfast', 'Optimized for real-time streaming with minimal delay')}
                ${this.renderPreset('Balanced', 'h264_vaapi', 'medium', 'Good quality/performance tradeoff for general use')}
                ${this.renderPreset('High Quality', 'libx264', 'slow', 'Maximum quality, higher CPU/GPU usage')}
            </div>

            <h3 style="margin-top: var(--space-xl)">FFmpeg Command Builder</h3>
            <div class="hw-ffmpeg-builder">
                <div class="hw-ffmpeg-row">
                    <label>Input</label>
                    <input type="text" class="hw-ffmpeg-input" value="-i rtsp://camera:554/stream" readonly>
                </div>
                <div class="hw-ffmpeg-row">
                    <label>Video Codec</label>
                    <select class="hw-ffmpeg-select" id="hw-vcodec">
                        <option value="h264_qsv">h264_qsv (Intel QuickSync)</option>
                        <option value="h264_vaapi">h264_vaapi (VAAPI)</option>
                        <option value="libx264" selected>libx264 (Software)</option>
                        <option value="h265_qsv">h265_qsv (Intel QuickSync)</option>
                        <option value="hevc_vaapi">hevc_vaapi (VAAPI)</option>
                        <option value="libx265">libx265 (Software)</option>
                    </select>
                </div>
                <div class="hw-ffmpeg-row">
                    <label>Preset</label>
                    <select class="hw-ffmpeg-select" id="hw-preset">
                        <option value="ultrafast">ultrafast</option>
                        <option value="veryfast">veryfast</option>
                        <option value="fast">fast</option>
                        <option value="medium" selected>medium</option>
                        <option value="slow">slow</option>
                    </select>
                </div>
                <div class="hw-ffmpeg-row">
                    <label>Output</label>
                    <input type="text" class="hw-ffmpeg-input" value="-f rtsp rtsp://localhost:8554/output" readonly>
                </div>
                <div class="hw-ffmpeg-preview">
                    <code id="hw-ffmpeg-cmd">ffmpeg -hwaccel auto -i rtsp://camera:554/stream -c:v libx264 -preset medium -f rtsp rtsp://localhost:8554/output</code>
                    <button class="phase2-btn sm secondary" id="hw-copy-cmd">Copy</button>
                </div>
            </div>
        `;

        this.element.append(card);

        const vcodec = card.querySelector('#hw-vcodec');
        const preset = card.querySelector('#hw-preset');
        const cmdEl = card.querySelector('#hw-ffmpeg-cmd');
        const copyBtn = card.querySelector('#hw-copy-cmd');

        const updateCmd = () => {
            const vc = vcodec.value;
            const pr = preset.value;
            const hwaccel = vc.includes('qsv') ? 'qsv' : vc.includes('vaapi') ? 'vaapi' : 'auto';
            const initHw = vc.includes('vaapi') ? ' -vaapi_device /dev/dri/renderD128' : '';
            cmdEl.textContent = `ffmpeg -hwaccel ${hwaccel}${initHw} -i rtsp://camera:554/stream -c:v ${vc} -preset ${pr} -f rtsp rtsp://localhost:8554/output`;
        };

        vcodec.addEventListener('change', updateCmd);
        preset.addEventListener('change', updateCmd);
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(cmdEl.textContent);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy', 1500);
        });

        return card;
    }

    renderPreset(name, codec, preset, desc) {
        return `
            <div class="hw-preset-card">
                <div class="hw-preset-header">
                    <span class="hw-preset-name">${name}</span>
                    <span class="hw-preset-codec">${codec}</span>
                </div>
                <div class="hw-preset-meta">
                    <span class="hw-preset-badge">${preset}</span>
                </div>
                <div class="hw-preset-desc">${desc}</div>
            </div>
        `;
    }

    toggleHTML(id, label, desc, checked) {
        return `
            <div class="hw-toggle-row">
                <div class="hw-toggle-info">
                    <div class="hw-toggle-label">${label}</div>
                    <div class="hw-toggle-desc">${desc}</div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        `;
    }

    destroy() {
        super.destroy();
    }
}
