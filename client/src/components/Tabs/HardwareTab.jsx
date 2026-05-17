import { useState } from 'react';

const ACCELERATORS = [
  { id: 'qsv',       name: 'Intel QuickSync',      desc: 'Hardware H.264/H.265 encode via QSV',          device: '/dev/dri/renderD128', available: true  },
  { id: 'vaapi',     name: 'VAAPI (i965/iHD)',      desc: 'Video Acceleration API via libva',              device: '/dev/dri/renderD128', available: true  },
  { id: 'onevpl',    name: 'Intel oneVPL',          desc: 'Next-gen media processing framework',           device: 'GPU: 0',             available: true  },
  { id: 'gstreamer', name: 'GStreamer 1.24',        desc: 'Pipeline-based media framework',                device: 'system',             available: true  },
  { id: 'ffmpeg',    name: 'FFmpeg 7.0',            desc: 'General-purpose multimedia framework',          device: 'system',             available: true  },
  { id: 'nvenc',     name: 'NVIDIA CUDA',           desc: 'NVENC/NVDEC hardware encoding',                 device: 'N/A',               available: false },
];

const PRESETS = [
  { name: 'Low Latency',  codec: 'h264_qsv',  preset: 'veryfast', desc: 'Optimized for real-time streaming with minimal delay'          },
  { name: 'Balanced',     codec: 'h264_vaapi', preset: 'medium',   desc: 'Good quality/performance tradeoff for general use'             },
  { name: 'High Quality', codec: 'libx264',    preset: 'slow',     desc: 'Maximum quality, higher CPU/GPU usage'                        },
];

function loadState() {
  try {
    const saved = localStorage.getItem('hw:state');
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return {
    enabled: true,
    fallbackCpu: true,
    accelerators: { qsv: true, vaapi: true, onevpl: false, gstreamer: true, ffmpeg: true, nvenc: false },
  };
}

function buildCmd(vcodec, preset) {
  const hwaccel = vcodec.includes('qsv') ? 'qsv' : vcodec.includes('vaapi') ? 'vaapi' : 'auto';
  const initHw  = vcodec.includes('vaapi') ? ' -vaapi_device /dev/dri/renderD128' : '';
  return `ffmpeg -hwaccel ${hwaccel}${initHw} -i rtsp://camera:554/stream -c:v ${vcodec} -preset ${preset} -f rtsp rtsp://localhost:8554/output`;
}

export default function HardwareTab() {
  const [state, setState] = useState(loadState);
  const [vcodec, setVcodec] = useState('libx264');
  const [preset, setPreset] = useState('medium');
  const [copyLabel, setCopyLabel] = useState('Copy');

  function save(next) {
    localStorage.setItem('hw:state', JSON.stringify(next));
    setState(next);
  }

  function toggleGlobal(field) {
    save({ ...state, [field]: !state[field] });
  }

  function toggleAcc(id) {
    save({ ...state, accelerators: { ...state.accelerators, [id]: !state.accelerators[id] } });
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildCmd(vcodec, preset));
    setCopyLabel('Copied!');
    setTimeout(() => setCopyLabel('Copy'), 1500);
  }

  return (
    <div className="tab hardware">
      {/* Global settings */}
      <div className="hw-global-settings">
        <div className="hw-global-row">
          <div className="hw-toggle-row">
            <div className="hw-toggle-info">
              <div className="hw-toggle-label">Enable Hardware Acceleration</div>
              <div className="hw-toggle-desc">Use GPU-based encoding/decoding when available</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={state.enabled} onChange={() => toggleGlobal('enabled')} />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="hw-toggle-row">
            <div className="hw-toggle-info">
              <div className="hw-toggle-label">Fallback to CPU</div>
              <div className="hw-toggle-desc">Automatically fall back to software encoding if hardware fails</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={state.fallbackCpu} onChange={() => toggleGlobal('fallbackCpu')} />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="hw-grid">
        {/* Detection card */}
        <div className="hw-card">
          <h3>Accelerator Detection</h3>
          {ACCELERATORS.map((acc) => {
            const enabled = state.accelerators[acc.id] ?? false;
            return (
              <div className="hw-detector" key={acc.id}>
                <div className="hw-detector-info">
                  <div className="hw-detector-name">{acc.name}</div>
                  <div className="hw-detector-desc">{acc.desc}</div>
                  <div className="hw-detector-device">{acc.device}</div>
                </div>
                <div className="hw-detector-right">
                  <span className={`status-badge ${acc.available ? 'available' : 'unavailable'}`}>
                    {acc.available ? 'Available' : 'Not Detected'}
                  </span>
                  <label className={`toggle-switch${!acc.available ? ' disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={!acc.available}
                      onChange={() => toggleAcc(acc.id)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        {/* Utilization + presets + builder card */}
        <div className="hw-card">
          <h3>GPU Utilization</h3>
          <div className="hw-utilization">
            <div className="hw-util-row">
              <span className="hw-util-label">GPU Usage</span>
              <span className="hw-util-value">—</span>
              <div className="progress-bar"><div className="fill" style={{ width: '0%' }}></div></div>
            </div>
            <div className="hw-util-row">
              <span className="hw-util-label">Video Memory</span>
              <span className="hw-util-value">—</span>
              <div className="progress-bar"><div className="fill" style={{ width: '0%' }}></div></div>
            </div>
            <div className="hw-util-row">
              <span className="hw-util-label">Transcode Sessions</span>
              <span className="hw-util-value">0 / 0</span>
              <div className="progress-bar"><div className="fill" style={{ width: '0%' }}></div></div>
            </div>
          </div>
          <div className="hw-util-note">GPU metrics available when running in Docker with device passthrough</div>

          <h3 style={{ marginTop: 'var(--space-xl)' }}>Transcoding Presets</h3>
          <div className="hw-presets">
            {PRESETS.map((p) => (
              <div className="hw-preset-card" key={p.name}>
                <div className="hw-preset-header">
                  <span className="hw-preset-name">{p.name}</span>
                  <span className="hw-preset-codec">{p.codec}</span>
                </div>
                <div className="hw-preset-meta">
                  <span className="hw-preset-badge">{p.preset}</span>
                </div>
                <div className="hw-preset-desc">{p.desc}</div>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: 'var(--space-xl)' }}>FFmpeg Command Builder</h3>
          <div className="hw-ffmpeg-builder">
            <div className="hw-ffmpeg-row">
              <label>Input</label>
              <input type="text" className="hw-ffmpeg-input" defaultValue="-i rtsp://camera:554/stream" readOnly />
            </div>
            <div className="hw-ffmpeg-row">
              <label>Video Codec</label>
              <select className="hw-ffmpeg-select" value={vcodec} onChange={(e) => setVcodec(e.target.value)}>
                <option value="h264_qsv">h264_qsv (Intel QuickSync)</option>
                <option value="h264_vaapi">h264_vaapi (VAAPI)</option>
                <option value="libx264">libx264 (Software)</option>
                <option value="h265_qsv">h265_qsv (Intel QuickSync)</option>
                <option value="hevc_vaapi">hevc_vaapi (VAAPI)</option>
                <option value="libx265">libx265 (Software)</option>
              </select>
            </div>
            <div className="hw-ffmpeg-row">
              <label>Preset</label>
              <select className="hw-ffmpeg-select" value={preset} onChange={(e) => setPreset(e.target.value)}>
                <option value="ultrafast">ultrafast</option>
                <option value="veryfast">veryfast</option>
                <option value="fast">fast</option>
                <option value="medium">medium</option>
                <option value="slow">slow</option>
              </select>
            </div>
            <div className="hw-ffmpeg-row">
              <label>Output</label>
              <input type="text" className="hw-ffmpeg-input" defaultValue="-f rtsp rtsp://localhost:8554/output" readOnly />
            </div>
            <div className="hw-ffmpeg-preview">
              <code>{buildCmd(vcodec, preset)}</code>
              <button className="phase2-btn sm secondary" onClick={handleCopy}>{copyLabel}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
