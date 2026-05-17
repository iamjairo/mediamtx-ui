import { useEffect, useState } from 'react';

const PRESETS = [
    {
        id: 'nvidia',
        name: 'NVIDIA NVENC / NVDEC',
        vendor: 'NVIDIA',
        description: 'Hardware accelerated H.264/HEVC encoding & decoding on NVIDIA GPUs (GTX 10-series and newer).',
        requires: ['NVIDIA GPU + recent drivers', 'CUDA 11+ recommended', 'ffmpeg built with --enable-cuda --enable-nvenc'],
        ffmpegArgs: '-hwaccel cuda -hwaccel_output_format cuda -i {source} -c:v h264_nvenc -preset p4 -tune ll -b:v 4M -maxrate 6M -bufsize 8M -f rtsp {dest}',
        color: '#22c55e',
    },
    {
        id: 'qsv',
        name: 'Intel Quick Sync Video',
        vendor: 'Intel',
        description: 'Built-in graphics on Intel CPUs (6th gen Skylake and newer). Excellent power efficiency for streaming workloads.',
        requires: ['Intel iGPU exposed via /dev/dri/renderD128', 'Linux: libmfx-gen + intel-media-driver', 'ffmpeg with --enable-libmfx'],
        ffmpegArgs: '-hwaccel qsv -c:v h264_qsv -i {source} -c:v h264_qsv -preset veryfast -b:v 4M -f rtsp {dest}',
        color: '#06b6d4',
    },
    {
        id: 'vaapi',
        name: 'VA-API (Linux generic)',
        vendor: 'Intel / AMD',
        description: 'Open-source Linux hardware acceleration. Works across Intel iGPUs, AMD GPUs, and some ARM SoCs.',
        requires: ['Linux only', '/dev/dri/renderD128 accessible', 'ffmpeg with --enable-vaapi'],
        ffmpegArgs: '-hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format vaapi -i {source} -c:v h264_vaapi -b:v 4M -f rtsp {dest}',
        color: '#a855f7',
    },
    {
        id: 'amf',
        name: 'AMD AMF',
        vendor: 'AMD',
        description: 'Advanced Media Framework — AMD GPUs with VCE/VCN encoders. Windows-first, Linux support via Mesa.',
        requires: ['AMD Radeon GPU', 'ffmpeg with --enable-amf', 'Windows: AMF runtime; Linux: Mesa drivers'],
        ffmpegArgs: '-i {source} -c:v h264_amf -quality speed -rc cbr -b:v 4M -f rtsp {dest}',
        color: '#f97316',
    },
    {
        id: 'videotoolbox',
        name: 'Apple VideoToolbox',
        vendor: 'Apple',
        description: 'Native macOS / iOS hardware acceleration. Works on Apple Silicon and Intel Macs with T2 chips.',
        requires: ['macOS only', 'ffmpeg with --enable-videotoolbox', 'Apple Silicon recommended for best perf'],
        ffmpegArgs: '-hwaccel videotoolbox -i {source} -c:v h264_videotoolbox -b:v 4M -f rtsp {dest}',
        color: '#94a3b8',
    },
    {
        id: 'rkmpp',
        name: 'Rockchip MPP',
        vendor: 'Rockchip',
        description: 'Hardware codec on Rockchip SoCs (RK3399, RK3588). Common in low-power CCTV NVR appliances.',
        requires: ['Rockchip SoC (RK3399/RK3588)', 'Linux with rkmpp drivers', 'ffmpeg-rockchip fork'],
        ffmpegArgs: '-hwaccel rkmpp -hwaccel_output_format drm_prime -afbc rga -i {source} -c:v h264_rkmpp -b:v 4M -f rtsp {dest}',
        color: '#f472b6',
    },
];

function PresetCard({ preset }) {
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        navigator.clipboard.writeText(preset.ffmpegArgs).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }

    return (
        <article className="hwaccel-card">
            <header className="hwaccel-card-header">
                <span className="hwaccel-vendor-dot" style={{ background: preset.color }}></span>
                <h4>{preset.name}</h4>
                <span className="hwaccel-vendor-badge">{preset.vendor}</span>
            </header>
            <p className="hwaccel-card-desc">{preset.description}</p>
            <div className="hwaccel-card-section">
                <span className="hwaccel-card-label">Requirements</span>
                <ul className="hwaccel-req-list">
                    {preset.requires.map((r) => (
                        <li key={r}>{r}</li>
                    ))}
                </ul>
            </div>
            <div className="hwaccel-card-section">
                <span className="hwaccel-card-label">FFmpeg snippet</span>
                <pre className="hwaccel-pre">{preset.ffmpegArgs}</pre>
                <button className="phase2-btn sm secondary hwaccel-copy-btn" onClick={handleCopy}>
                    {copied ? 'Copied!' : 'Copy snippet'}
                </button>
            </div>
        </article>
    );
}

export default function HwAccelTab() {
    const [sysInfo, setSysInfo] = useState({
        platform: '…',
        userAgent: '…',
        gpu: '…',
        cores: '…',
    });

    useEffect(() => {
        const platform = navigator.platform || navigator.userAgentData?.platform || 'unknown';
        const userAgent = (navigator.userAgent || '').split(/\(|\)/)[0].trim() || 'unknown';
        const cores = String(navigator.hardwareConcurrency || 'unknown');

        let gpu = 'unknown';
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const dbg = gl.getExtension('WEBGL_debug_renderer_info');
                if (dbg) gpu = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || 'unknown';
            }
        } catch (_) {}

        setSysInfo({ platform, userAgent, gpu, cores });
    }, []);

    return (
        <div className="tab hwaccel-tab">
            <div className="hwaccel-header">
                <div className="hwaccel-header-left">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                        <rect x="9" y="9" width="6" height="6" />
                        <line x1="9" y1="2" x2="9" y2="4" />
                        <line x1="15" y1="2" x2="15" y2="4" />
                        <line x1="9" y1="20" x2="9" y2="22" />
                        <line x1="15" y1="20" x2="15" y2="22" />
                        <line x1="20" y1="9" x2="22" y2="9" />
                        <line x1="20" y1="14" x2="22" y2="14" />
                        <line x1="2" y1="9" x2="4" y2="9" />
                        <line x1="2" y1="14" x2="4" y2="14" />
                    </svg>
                    <div>
                        <h2>Hardware Acceleration</h2>
                        <p>Detect GPU/codec offload options and copy ready-to-use FFmpeg config snippets</p>
                    </div>
                </div>
            </div>

            <div className="hwaccel-detected">
                <div className="hwaccel-detected-inner">
                    <h3>Detected Environment</h3>
                    <div className="hwaccel-detect-grid">
                        <div className="hwaccel-stat">
                            <span>Platform</span>
                            <span className="value">{sysInfo.platform}</span>
                        </div>
                        <div className="hwaccel-stat">
                            <span>Browser</span>
                            <span className="value">{sysInfo.userAgent}</span>
                        </div>
                        <div className="hwaccel-stat">
                            <span>GPU (WebGL)</span>
                            <span className="value">{sysInfo.gpu}</span>
                        </div>
                        <div className="hwaccel-stat">
                            <span>Hardware Concurrency</span>
                            <span className="value">{sysInfo.cores}</span>
                        </div>
                    </div>
                    <p className="hwaccel-detect-note">
                        Note: server-side GPU/codec detection requires the operator to inspect the host (<code>nvidia-smi</code>, <code>vainfo</code>, <code>ffmpeg -hwaccels</code>).
                        The presets below cover the most common targets.
                    </p>
                </div>
            </div>

            <section className="hwaccel-presets">
                <h3 className="hwaccel-section-heading">Encoder Presets</h3>
                <div className="hwaccel-preset-grid">
                    {PRESETS.map((preset) => (
                        <PresetCard key={preset.id} preset={preset} />
                    ))}
                </div>
            </section>
        </div>
    );
}
