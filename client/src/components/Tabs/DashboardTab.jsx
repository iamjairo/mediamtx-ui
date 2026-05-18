import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fm } from '../../lib/fetchManager.js';

// ── Static data ───────────────────────────────────────────────────────────────
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ROOMS = [
  { id: 'entrance',    name: 'Entrance',       icon: 'door'  },
  { id: 'backyard',    name: 'Backyard',        icon: 'sun'   },
  { id: 'workstation', name: 'My Workstation',  icon: 'zap'   },
  { id: 'living',      name: 'Living Room',     icon: 'tv'    },
  { id: 'front',       name: 'Front Room',      icon: 'home'  },
];

const ENV_PRESETS = [
  { id: 'music',  label: 'Listen to Music', icon: 'music' },
  { id: 'relax',  label: 'Cool and Relax',  icon: 'moon'  },
  { id: 'night',  label: 'Good Night',      icon: 'sun'   },
  { id: 'arrive', label: 'Arrive Home',     icon: 'home'  },
];

const EFFECT_COLORS = ['iot-effect-amber', 'iot-effect-green', 'iot-effect-purple'];

// ── Inline SVG icons (camelCased for JSX) ─────────────────────────────────────
const Icons = {
  door: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/>
      <path d="M10 12v.01"/>
      <path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/>
    </svg>
  ),
  sun: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/>
      <path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>
      <path d="M2 12h2"/><path d="M20 12h2"/>
      <path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
    </svg>
  ),
  zap: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
    </svg>
  ),
  tv: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/>
    </svg>
  ),
  home: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    </svg>
  ),
  music: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  ),
  moon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    </svg>
  ),
  plus: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14"/><path d="M12 5v14"/>
    </svg>
  ),
  wind: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
    </svg>
  ),
  mic: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="6" height="11" x="9" y="2" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" x2="12" y1="19" y2="22"/>
    </svg>
  ),
  wifi: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 13a10 10 0 0 1 14 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M12 20h.01"/>
      <path d="M2 8.82a15 15 0 0 1 20 0"/>
    </svg>
  ),
  airplay: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"/>
      <polygon points="12 15 17 21 7 21 12 15"/>
    </svg>
  ),
  snow: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 4v16"/><path d="m18 6 2-2 2 2"/><path d="m18 18 2 2 2-2"/>
      <path d="M12 6V2"/><path d="M12 22v-4"/>
      <path d="m6 12 16 0"/><path d="m4 14 2-2-2-2"/><path d="m18 10 2 2-2 2"/>
    </svg>
  ),
  cloudy: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
    </svg>
  ),
  calendar: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 2v4"/><path d="M16 2v4"/>
      <rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>
    </svg>
  ),
  bell: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.268 21a2 2 0 0 0 3.464 0"/>
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>
    </svg>
  ),
  play: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
  ),
  pause: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
  ),
  skipBack: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/>
    </svg>
  ),
  skipFwd: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>
    </svg>
  ),
  shuffle: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 18h1.4a2 2 0 0 0 1.7-1l4.9-8a2 2 0 0 1 1.7-1H16"/>
      <path d="M2 6h1.4a2 2 0 0 1 1.7 1l4.9 8a2 2 0 0 0 1.7 1H16"/>
      <polyline points="18 3 22 7 18 11"/><polyline points="18 13 22 17 18 21"/>
    </svg>
  ),
  download: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
      <path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/>
    </svg>
  ),
  upload: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
      <path d="M12 3v14"/><path d="m6 9 6-6 6 6"/><path d="M5 21h14"/>
    </svg>
  ),
  latency: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2">
      <path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
};

// ── SVG Circular Dial ─────────────────────────────────────────────────────────
function Dial({ value, max, label, unit, color, colorClass, size, ticks, arcFraction }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;
  const pct = value / max;
  const dashOffset = circumference * (1 - pct * arcFraction);

  const tickEls = [];
  for (let i = 0; i < ticks; i++) {
    const angleRange = arcFraction * 360;
    const startAngle = -90 - angleRange / 2;
    const angle = startAngle + (i / (ticks - 1)) * angleRange;
    const rad = (angle * Math.PI) / 180;
    const r1 = radius + 10;
    const r2 = radius + 16;
    tickEls.push(
      <line
        key={i}
        x1={cx + r1 * Math.cos(rad)}
        y1={cy + r1 * Math.sin(rad)}
        x2={cx + r2 * Math.cos(rad)}
        y2={cy + r2 * Math.sin(rad)}
        className="iot-dial-tick"
      />
    );
  }

  return (
    <div className="iot-dial-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={cx} cy={cy} r={radius}
          className="iot-dial-bg"
          strokeDasharray={`${circumference * arcFraction} ${circumference * (1 - arcFraction)}`}
        />
        <circle
          cx={cx} cy={cy} r={radius}
          className="iot-dial-progress"
          stroke={color}
          strokeDasharray={`${circumference * arcFraction} ${circumference}`}
          strokeDashoffset={dashOffset}
        />
        {tickEls}
      </svg>
      <div className="iot-dial-center">
        <span className="iot-dial-label">{label}</span>
        <span className={`iot-dial-value ${colorClass}`}>{value}{unit}</span>
      </div>
    </div>
  );
}

// ── IoT Card wrapper ──────────────────────────────────────────────────────────
function IotCard({ title, badge, headerExtra, children, className }) {
  return (
    <div className={`iot-card${className ? ' ' + className : ''}`}>
      <div className="iot-card-header">
        <span className="iot-card-title">{title}</span>
        {badge && <span className="iot-card-badge">{badge}</span>}
        {headerExtra}
      </div>
      {children}
    </div>
  );
}

// ── Greeting card (top-left) ─────────────────────────────────────────────────
function GreetingCard({ activeRoomName }) {
  const h = new Date().getHours();
  const greeting = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="iot-greeting">
      <div className="iot-greeting-avatar">
        <div className="iot-greeting-avatar-ring"></div>
        <div className="iot-greeting-avatar-img">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 21a8 8 0 0 1 16 0"/>
          </svg>
        </div>
        <div className="iot-greeting-badge">4</div>
      </div>
      <div className="iot-greeting-text">
        <span className="iot-greeting-eyebrow">{greeting.toUpperCase()}</span>
        <h2 className="iot-greeting-name">Welcome back</h2>
      </div>
      <button className="iot-greeting-menu" aria-label="More">⋯</button>
    </div>
  );
}

// ── Active room hero (top-center) ────────────────────────────────────────────
function ActiveRoomHero({ name, deviceCount, onAdd }) {
  return (
    <div className="iot-active-room">
      <div className="iot-active-room-text">
        <h2 className="iot-active-room-title">{name}<span className="iot-active-room-menu">⋯</span></h2>
        <span className="iot-active-room-sub">{deviceCount} Devices running</span>
      </div>
      <button className="iot-add-device" onClick={onAdd}>
        <span className="iot-add-device-plus">+</span>
        <span>Add New Device</span>
      </button>
    </div>
  );
}

// ── Compact weather + clock strip (top-right) ────────────────────────────────
function HeaderInfoStrip() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  const date = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="iot-header-strip">
      <div className="iot-weather-pill">
        <div className="iot-weather-pill-icon">{Icons.cloudy}</div>
        <div className="iot-weather-pill-text">
          <span className="iot-weather-pill-label">Cloudy</span>
          <span className="iot-weather-pill-temp">21<sup>°C</sup></span>
        </div>
      </div>
      <div className="iot-clock-pill">{time}</div>
      <div className="iot-date-pill">{Icons.calendar}{' '}{date}</div>
    </div>
  );
}

// ── Rooms panel ───────────────────────────────────────────────────────────────
function RoomsPanel({ active, setActive }) {
  return (
    <IotCard title="My Rooms">
      <div className="iot-rooms-grid">
        {ROOMS.map((room) => (
          <button
            key={room.id}
            className={`iot-room-btn${room.id === active ? ' active' : ''}`}
            onClick={() => setActive(room.id)}
          >
            <div className="iot-room-icon">{Icons[room.icon] || Icons.home}</div>
            <span className="iot-room-name">{room.name}</span>
          </button>
        ))}
        <button className="iot-room-add">
          {Icons.plus}<span>Add new</span>
        </button>
      </div>
    </IotCard>
  );
}

// ── Environment panel ─────────────────────────────────────────────────────────
function EnvironmentPanel() {
  const [active, setActive] = useState('relax');
  return (
    <IotCard title="Set Room Environment">
      <div className="iot-env-grid">
        {ENV_PRESETS.map((preset) => (
          <button
            key={preset.id}
            className={`iot-env-btn${preset.id === active ? ' active' : ''}`}
            onClick={() => setActive(preset.id)}
          >
            <div className="iot-env-icon">{Icons[preset.icon] || null}</div>
            <span className="iot-env-label">{preset.label}</span>
          </button>
        ))}
      </div>
    </IotCard>
  );
}

// ── Voice assistance panel ───────────────────────────────────────────────────
function VoiceAssistancePanel() {
  // Pre-computed waveform bars seeded by index — stable across renders, no Math.random.
  const bars = Array.from({ length: 48 }, (_, i) => {
    const s = Math.sin(i * 0.6) * Math.cos(i * 0.3);
    return 6 + Math.abs(s) * 22;
  });
  return (
    <IotCard title="Voice Assistance">
      <div className="iot-voice-row">
        <button className="iot-voice-mic" aria-label="Listening">
          <span className="iot-voice-mic-ring"></span>
          {Icons.mic}
        </button>
        <div className="iot-voice-text">
          <div className="iot-voice-cmd">
            <span className="iot-voice-cmd-prefix">Hey Google,</span>{' '}
            <span>turn off my </span><strong>bedroom's lamp</strong>
          </div>
        </div>
      </div>
      <div className="iot-voice-wave">
        {bars.map((h, i) => (
          <div key={i} className="iot-voice-wave-bar" style={{ height: `${h}px`, animationDelay: `${i * 0.06}s` }}></div>
        ))}
      </div>
    </IotCard>
  );
}

// ── Accessories grid (top-center inside main area) ────────────────────────────
function AccessoriesGrid({ streams, navigate }) {
  const accessories = [
    {
      id: 'wifi', name: 'Nest Wi-Fi', status: 'Running',
      icon: <div className="iot-accessory-icon-img green">{Icons.wifi}</div>,
      onClick: () => {},
    },
    {
      id: 'cctv', name: 'CCTV', status: streams.length > 0 ? `${streams.length} live` : 'Idle',
      icon: <div className="iot-accessory-icon-img blue">{Icons.airplay}</div>,
      onClick: () => navigate('/camerawall'),
    },
    {
      id: 'ac', name: 'AC', status: 'Turned off',
      icon: <div className="iot-accessory-icon-img slate">{Icons.snow}</div>,
      onClick: () => {},
    },
  ];

  return (
    <IotCard title="Accessories">
      <div className="iot-accessories-grid">
        {accessories.map((a) => (
          <button key={a.id} className="iot-accessory-card" onClick={a.onClick}>
            <div className="iot-accessory-top">
              {a.icon}
              <button className="iot-accessory-menu" aria-label="More">⋯</button>
            </div>
            <div className="iot-accessory-info">
              <div className="iot-accessory-name">{a.name}</div>
              <div className="iot-accessory-status">{a.status}</div>
            </div>
            <span className="iot-accessory-arrow">›</span>
          </button>
        ))}
      </div>
    </IotCard>
  );
}

// ── Music player ─────────────────────────────────────────────────────────────
function MusicPlayer() {
  const [playing, setPlaying] = useState(true);
  const [pos, setPos] = useState(152); // 2:32 in seconds
  const total = 384; // 6:24

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setPos((p) => (p + 1) % total);
    }, 1000);
    return () => clearInterval(id);
  }, [playing]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const pct = (pos / total) * 100;

  return (
    <IotCard title="Now Playing" className="iot-music-card">
      <div className="iot-music-art">
        <div className="iot-music-art-overlay"></div>
        <div className="iot-music-art-tag">
          <div className="iot-music-art-tag-icon">{Icons.music}</div>
        </div>
        <div className="iot-music-art-text">
          <div className="iot-music-art-title">Rainy day (relaxing sound)</div>
          <div className="iot-music-art-sub">Currently playing</div>
        </div>
      </div>
      <div className="iot-music-progress">
        <span className="iot-music-time">{fmt(pos)}</span>
        <div className="iot-music-bar"><div className="iot-music-bar-fill" style={{ width: `${pct}%` }}></div></div>
        <span className="iot-music-time muted">{fmt(total - pos)}</span>
      </div>
      <div className="iot-music-ctrls">
        <button className="iot-music-btn small" aria-label="Shuffle">{Icons.shuffle}</button>
        <button className="iot-music-btn" aria-label="Previous">{Icons.skipBack}</button>
        <button className="iot-music-btn play" onClick={() => setPlaying((v) => !v)} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? Icons.pause : Icons.play}
        </button>
        <button className="iot-music-btn" aria-label="Next">{Icons.skipFwd}</button>
        <button className="iot-music-btn small" aria-label="Repeat">↻</button>
      </div>
    </IotCard>
  );
}

// ── Weather panel ─────────────────────────────────────────────────────────────
function WeatherPanel() {
  const h = new Date().getHours();
  const today = (new Date().getDay() + 6) % 7;

  const hourlyData = [
    { time: `${h}:00`,     temp: 23, icon: 'thunder', active: true  },
    { time: `${h + 1}:00`, temp: 21, icon: 'rain',    active: false },
    { time: `${h + 2}:00`, temp: 22, icon: 'rain',    active: false },
    { time: `${h + 3}:00`, temp: 19, icon: 'wind',    active: false },
  ];

  function weatherIcon(icon, active) {
    const stroke = active ? '#fff' : icon === 'thunder' ? '#facc15' : icon === 'rain' ? '#38bdf8' : '#22d3ee';
    if (icon === 'thunder') return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
        <path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/>
        <path d="m13 12-3 5h4l-3 5"/>
      </svg>
    );
    if (icon === 'rain') return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
        <path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>
      </svg>
    );
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
        <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
        <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
        <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
      </svg>
    );
  }

  function dayWeatherIcon(mod) {
    if (mod === 0) return (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
        <path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>
      </svg>
    );
    if (mod === 1) return (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2">
        <path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/>
        <path d="m13 12-3 5h4l-3 5"/>
      </svg>
    );
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
        <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/>
        <path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>
        <path d="M2 12h2"/><path d="M20 12h2"/>
        <path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
      </svg>
    );
  }

  // stable random temps seeded by day index
  const weekTemps = WEEK_DAYS.map((_, i) => ({
    hi: 20 + ((i * 7 + 3) % 6),
    lo: 13 + ((i * 5 + 1) % 5),
  }));

  return (
    <IotCard title="Weather" badge="Today" className="iot-weather">
      <div className="weather-blob-1"></div>
      <div className="weather-blob-2"></div>

      <div className="weather-main">
        <div className="weather-cloud-wrap">
          <svg className="cloud-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
          </svg>
          <div className="weather-lightning">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/>
              <path d="m13 12-3 5h4l-3 5"/>
            </svg>
          </div>
          <div className="weather-rain">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="rain-drop" style={{ animationDelay: `${i * 0.15}s` }}></div>
            ))}
          </div>
        </div>
        <div className="weather-temp">
          <div className="weather-temp-value">23<sup>°</sup></div>
          <div className="weather-condition">Thunderclouds</div>
          <div className="weather-meta">
            <span className="weather-meta-item">
              <svg className="cyan" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
              </svg>{' '}13 km/h
            </span>
            <span className="weather-meta-item">
              <svg className="blue" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/>
                <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>
              </svg>{' '}24%
            </span>
            <span className="weather-meta-item">
              <svg className="sky" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
                <path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>
              </svg>{' '}87%
            </span>
          </div>
        </div>
      </div>

      {/* Hourly */}
      <div className="weather-hourly">
        {hourlyData.map((item, i) => (
          <div key={i} className={`weather-hour${item.active ? ' active' : ''}`}>
            <span className="weather-hour-temp">{item.temp}°</span>
            <span>{weatherIcon(item.icon, item.active)}</span>
            <span className="weather-hour-time">{item.time}</span>
          </div>
        ))}
      </div>

      {/* Weekly */}
      <div className="weather-weekly">
        {WEEK_DAYS.map((day, i) => {
          const offset = (i - today + 7) % 7;
          const { hi, lo } = weekTemps[i];
          return (
            <div className="weather-day" key={day}>
              <span className="weather-day-name">{offset === 0 ? 'Today' : day}</span>
              <div className="weather-day-icon">
                {dayWeatherIcon(i % 3)}
                <span className="label">
                  {i % 3 === 0 ? 'Rainy' : i % 3 === 1 ? 'Storm' : 'Cloudy'}
                </span>
              </div>
              <span className="weather-day-temps">
                +{hi}°{' '}<span className="low">+{lo}°</span>
              </span>
            </div>
          );
        })}
      </div>
    </IotCard>
  );
}

// ── A/C panel ─────────────────────────────────────────────────────────────────
function ACPanel() {
  return (
    <IotCard title="Air Conditioner" headerExtra={<span className="iot-card-warn">⚠ 2 report ▾</span>}>
      <div className="iot-ac-content">
        <Dial
          value={15} max={30} label="Temperature" unit="°C"
          color="#8b5cf6" colorClass="purple" size={130} ticks={24} arcFraction={0.75}
        />
        <div className="iot-ac-stats">
          <div className="iot-ac-stat">
            <div className="iot-ac-stat-label">Swing Mode</div>
            <div className="iot-ac-stat-value green">Up &amp; Down</div>
          </div>
          <div className="iot-ac-stat">
            <div className="iot-ac-stat-label">Wind Level</div>
            <div className="iot-ac-stat-value amber">{Icons.wind}{' '}54%</div>
          </div>
        </div>
      </div>
    </IotCard>
  );
}

// ── LED panel ─────────────────────────────────────────────────────────────────
function LEDPanel() {
  const [on, setOn] = useState(true);
  const [brightness] = useState(35);
  const [activeEffect, setActiveEffect] = useState(2);

  return (
    <IotCard title="LED Strips Light" headerExtra={<span className="iot-card-cog">⚙</span>}>
      <div className="iot-led-content">
        <div style={{ position: 'relative' }}>
          <Dial
            value={on ? brightness : 0} max={100} label="Brightness" unit="%"
            color="#8b5cf6" colorClass="purple" size={140} ticks={20} arcFraction={0.8}
          />
          <button className="iot-led-power" onClick={() => setOn((v) => !v)}>
            {Icons.zap}
          </button>
        </div>
        <div className="iot-led-effects">
          <span className="iot-led-effects-title">Effects</span>
          {EFFECT_COLORS.map((cls, i) => (
            <button
              key={cls}
              className={`iot-effect-btn ${cls}${i === activeEffect ? ' active' : ''}`}
              onClick={() => setActiveEffect(i)}
            />
          ))}
        </div>
      </div>
    </IotCard>
  );
}

// ── Router/Server stats panel (top-right) ────────────────────────────────────
function RouterStatsPanel({ streams, caddyStatus, dockerContainers }) {
  // Live stats from the MediaMTX backend dressed in router clothing.
  // When the backend is unreachable, the mock data shines through.
  const dl = streams.length ? (153.65 - streams.length * 0.4).toFixed(2) : '153.65';
  const ul = streams.length ? (198.55 - streams.length * 0.6).toFixed(2) : '198.55';
  const lat = caddyStatus?.running ? '9' : '12';
  return (
    <IotCard
      title="Network"
      headerExtra={<span className="iot-card-menu">⋯</span>}
    >
      <div className="iot-router-grid">
        <div className="iot-router-stat">
          <div className="iot-router-stat-value green">{dl}<span className="muted"> Mbps</span></div>
          <div className="iot-router-stat-label">{Icons.download}{' '}Download</div>
        </div>
        <div className="iot-router-stat">
          <div className="iot-router-stat-value blue">{ul}<span className="muted"> Mbps</span></div>
          <div className="iot-router-stat-label">{Icons.upload}{' '}Upload</div>
        </div>
        <div className="iot-router-stat">
          <div className="iot-router-stat-value amber">{lat}<span className="muted">ms</span></div>
          <div className="iot-router-stat-label">{Icons.latency}{' '}Idle Latency</div>
        </div>
      </div>
    </IotCard>
  );
}

// ── Electricity / bandwidth chart ────────────────────────────────────────────
function BandwidthChart() {
  // Stable seeded curve — same look across renders.
  const points = Array.from({ length: 24 }, (_, i) => {
    const x = i / 23;
    const y = 50 + Math.sin(i * 0.55) * 20 + Math.cos(i * 0.3) * 12 + (i > 14 ? 8 : 0);
    return [x * 100, 100 - y];
  });
  const pathD = points.reduce((acc, [x, y], i) => {
    if (i === 0) return `M ${x} ${y}`;
    const [px, py] = points[i - 1];
    const cx1 = px + (x - px) / 2;
    const cx2 = px + (x - px) / 2;
    return `${acc} C ${cx1} ${py}, ${cx2} ${y}, ${x} ${y}`;
  }, '');
  const areaD = `${pathD} L 100 100 L 0 100 Z`;

  return (
    <IotCard
      title="Bandwidth"
      headerExtra={<span className="iot-card-pill">{Icons.calendar}{' '}Past 6 hours ▾</span>}
    >
      <div className="iot-chart-wrap">
        <div className="iot-chart-axis-y">
          {['100%', '75%', '50%', '25%', '0%'].map((v) => <span key={v}>{v}</span>)}
        </div>
        <svg className="iot-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0"/>
            </linearGradient>
          </defs>
          {[20, 40, 60, 80].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(148,163,184,0.08)" strokeWidth="0.2"/>
          ))}
          <path d={areaD} fill="url(#chartFill)"/>
          <path d={pathD} fill="none" stroke="#22d3ee" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
          {points.filter((_, i) => i % 4 === 0).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="0.6" fill="#22d3ee"/>
          ))}
        </svg>
      </div>
      <div className="iot-chart-axis-x">
        {['-6h', '-5h', '-4h', '-3h', '-2h', '-1h', 'now'].map((t) => <span key={t}>{t}</span>)}
      </div>
    </IotCard>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardTab() {
  const navigate = useNavigate();
  const [streams, setStreams] = useState([]);
  const [caddyStatus, setCaddyStatus] = useState(null);
  const [dockerContainers, setDockerContainers] = useState([]);
  const [activeRoom, setActiveRoom] = useState('workstation');

  async function loadData() {
    try {
      const res = await fm.fetch('/mediamtx/paths/list');
      if (res?.ok) {
        const data = await res.json();
        setStreams(data.items || []);
      }
    } catch (_) {}

    try {
      const res = await fm.fetch('/api/caddy/status');
      if (res?.ok) setCaddyStatus(await res.json());
    } catch (_) {}

    try {
      const res = await fm.fetch('/api/docker/containers');
      if (res?.ok) {
        const data = await res.json();
        setDockerContainers(data.containers || data || []);
      }
    } catch (_) {}
  }

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 10000);
    return () => clearInterval(id);
  }, []);

  const activeRoomName = ROOMS.find((r) => r.id === activeRoom)?.name || 'Dashboard';
  const deviceCount = 12; // would aggregate accessories + streams in a real integration

  return (
    <div className="tab dashboard iot-dashboard">
      {/* Top strip — greeting | active room | weather+clock */}
      <div className="iot-top-strip">
        <GreetingCard />
        <ActiveRoomHero name={activeRoomName} deviceCount={deviceCount} onAdd={() => navigate('/streams')} />
        <HeaderInfoStrip />
      </div>

      {/* 3-column IoT layout */}
      <div className="dash-iot-layout">
        {/* Left column */}
        <div className="dash-iot-left">
          <RoomsPanel active={activeRoom} setActive={setActiveRoom} />
          <EnvironmentPanel />
          <VoiceAssistancePanel />
        </div>

        {/* Center column */}
        <div className="dash-iot-center">
          <AccessoriesGrid streams={streams} navigate={navigate} />
          <MusicPlayer />
          <ACPanel />
        </div>

        {/* Right column */}
        <div className="dash-iot-right">
          <RouterStatsPanel streams={streams} caddyStatus={caddyStatus} dockerContainers={dockerContainers} />
          <LEDPanel />
          <BandwidthChart />
        </div>
      </div>

      {/* Animated weather — moved to bottom full-width row */}
      <div className="iot-weather-row">
        <WeatherPanel />
      </div>
    </div>
  );
}
