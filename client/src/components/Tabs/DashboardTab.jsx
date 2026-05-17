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

const PROTOCOLS = ['WebRTC', 'HLS', 'LL-HLS', 'RTSP', 'RTMP', 'SRT', 'MPEG-TS', 'RTP'];

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
};

// ── Helper: split camelCase ───────────────────────────────────────────────────
function splitCamelCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

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
function IotCard({ title, badge, children, className }) {
  return (
    <div className={`iot-card${className ? ' ' + className : ''}`}>
      <div className="iot-card-header">
        <span className="iot-card-title">{title}</span>
        {badge && <span className="iot-card-badge">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Rooms panel ───────────────────────────────────────────────────────────────
function RoomsPanel() {
  const [active, setActive] = useState('workstation');
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
    <IotCard title="Air Conditioner">
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
    <IotCard title="LED Strips Light">
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

// ── Connectivity panel ────────────────────────────────────────────────────────
function ConnectivityPanel({ streams, caddyStatus, dockerContainers, navigate }) {
  const servers = [
    { name: 'MediaMTX', detail: 'localhost',                         online: true                           },
    { name: 'Go2RTC',   detail: 'RTSP / WebRTC relay',              online: false                          },
    { name: 'Caddy',    detail: caddyStatus?.version ? `v${caddyStatus.version}` : 'Reverse proxy', online: caddyStatus?.running === true },
    { name: 'Docker',   detail: `${dockerContainers.length} container(s)`,                          online: dockerContainers.length > 0  },
  ];

  return (
    <div className="dash-panel dash-connectivity">
      <div className="dash-panel-header">
        <h3>Server Connectivity</h3>
        <span className="dash-panel-link" onClick={() => navigate('/server')} style={{ cursor: 'pointer' }}>
          Configure →
        </span>
      </div>
      <div className="dash-server-list">
        {servers.map((s) => (
          <div className="dash-server-row" key={s.name}>
            <div className="dash-server-info">
              <div className="dash-server-name">{s.name}</div>
              <div className="dash-server-detail">{s.detail}</div>
            </div>
            <div className="dash-server-status">
              <span className={`status-dot ${s.online ? 'online' : 'offline'}`}></span>
              <span>{s.online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        ))}
      </div>
      <button className="dash-add-server" onClick={() => navigate('/server')}>
        <span>+</span><span>Add Server Connection</span>
      </button>
    </div>
  );
}

// ── Event log panel ───────────────────────────────────────────────────────────
function EventLogPanel() {
  const [events, setEvents] = useState([{ time: new Date().toLocaleTimeString('en-US', { hour12: false }), msg: 'Dashboard initialized — system online' }]);

  function clear() { setEvents([]); }

  return (
    <div className="dash-panel dash-events">
      <div className="dash-panel-header">
        <h3>Event Log</h3>
        <span className="dash-live-badge">LIVE</span>
      </div>
      <div className="dash-event-list">
        {events.length === 0 ? (
          <div className="dash-event-empty">
            <div className="dash-event-empty-icon">📋</div>
            <span>No events yet</span>
          </div>
        ) : events.map((ev, i) => (
          <div className="dash-event-item" key={i}>
            <span className="dash-event-time">{ev.time}</span>
            <span className="dash-event-msg">{ev.msg}</span>
          </div>
        ))}
      </div>
      <div className="dash-event-footer">
        <span>{events.length} events</span>
        <button onClick={clear}>Clear log</button>
      </div>
    </div>
  );
}

// ── Stream overview panel ─────────────────────────────────────────────────────
function StreamOverviewPanel({ streams, navigate }) {
  const shown = streams.slice(0, 4);

  return (
    <div className="dash-stream-overview">
      <div className="dash-panel-header">
        <h3>CCTV Monitor</h3>
        <span className="dash-panel-link" onClick={() => navigate('/camerawall')} style={{ cursor: 'pointer' }}>
          Camera Wall →
        </span>
      </div>
      <div className="dash-stream-preview">
        {shown.length === 0 ? (
          <div className="dash-stream-empty">
            <div className="dash-stream-empty-icon">📺</div>
            <p>No streams configured yet</p>
            <button onClick={() => navigate('/streams')}>Add a Stream</button>
          </div>
        ) : (
          <div className="dash-stream-mini-grid">
            {shown.map((stream, i) => {
              const name = stream.name || stream.confName || '—';
              const sourceType = stream.source?.type || '';
              const protoText = sourceType ? splitCamelCase(sourceType).toUpperCase().split(' ')[0] : 'RTSP';
              return (
                <div className="dash-stream-mini-card" key={i} onClick={() => navigate('/camerawall')} style={{ cursor: 'pointer' }}>
                  <div className="dash-stream-thumb">
                    <div className="dash-stream-thumb-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="6" width="15" height="12" rx="2"/>
                        <path d="M17 10l4-2.5v9L17 14"/>
                      </svg>
                    </div>
                    <div className="dash-stream-thumb-status">LIVE</div>
                    <div className="dash-stream-thumb-proto">{protoText}</div>
                  </div>
                  <div className="dash-stream-mini-footer">
                    <div className="dash-stream-mini-dot"></div>
                    <div className="dash-stream-mini-name" title={name}>{name}</div>
                  </div>
                </div>
              );
            })}
            {streams.length > 4 && (
              <div
                className="dash-stream-mini-card"
                style={{ justifyContent: 'center', color: 'var(--text-muted-color)', fontSize: 'var(--fs-xs)', cursor: 'pointer' }}
                onClick={() => navigate('/streams')}
              >
                +{streams.length - 4} more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DashboardTab() {
  const navigate = useNavigate();
  const [streams, setStreams] = useState([]);
  const [caddyStatus, setCaddyStatus] = useState(null);
  const [dockerContainers, setDockerContainers] = useState([]);

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

  // Derived stat values
  function serverCount() {
    let n = 1;
    if (caddyStatus?.running) n++;
    if (dockerContainers.length > 0) n++;
    return n;
  }

  const statCards = [
    { icon: '📡', value: String(streams.length),              label: 'Active Streams', sub: 'paths configured' },
    { icon: '🖥️', value: String(serverCount()),              label: 'Servers',         sub: 'connected'        },
    { icon: '🎥', value: streams.length > 0 ? 'Active' : 'Idle', label: 'Camera Wall', sub: 'viewer'          },
    { icon: '💚', value: 'Nominal',                           label: 'System Health',  sub: 'status'           },
  ];

  return (
    <div className="tab dashboard">
      {/* Welcome banner */}
      <div className="dash-welcome">
        <div className="dash-status-banner">SYSTEM ONLINE</div>
        <h2>Welcome back</h2>
        <p>MediaMTX Dashboard — Stream Management Hub</p>
      </div>

      {/* Stat cards row */}
      <div className="dash-stats-row">
        {statCards.map((card) => (
          <div className="dash-stat-card" key={card.label}>
            <div className="dash-stat-icon">{card.icon}</div>
            <div className="dash-stat-value">{card.value}</div>
            <div className="dash-stat-label">{card.label}</div>
            <div className="dash-stat-sub">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* 3-column IoT layout */}
      <div className="dash-iot-layout">
        {/* Left column */}
        <div className="dash-iot-left">
          <RoomsPanel />
          <EnvironmentPanel />
          <WeatherPanel />
        </div>

        {/* Center column */}
        <div className="dash-iot-center">
          <div className="dash-grid">
            <ConnectivityPanel
              streams={streams}
              caddyStatus={caddyStatus}
              dockerContainers={dockerContainers}
              navigate={navigate}
            />
            <EventLogPanel />
          </div>

          <StreamOverviewPanel streams={streams} navigate={navigate} />

          {/* Metrics */}
          <div className="dash-metrics-row">
            {[
              { label: 'CPU USAGE',    icon: '🖥',  value: '—', fillPct: 0 },
              { label: 'STORAGE USED', icon: '💾', value: '—', fillPct: 0 },
              { label: 'BANDWIDTH',    icon: '📶', value: '—', fillPct: 0 },
            ].map((m) => (
              <div className="dash-metric-card" key={m.label}>
                <div className="dash-metric-header">
                  <span className="dash-metric-label">{m.label}</span>
                  <span className="dash-metric-icon">{m.icon}</span>
                </div>
                <div className="dash-metric-value">{m.value}</div>
                <div className="dash-metric-bar">
                  <div className="dash-metric-fill" style={{ width: `${m.fillPct}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Protocols */}
          <div className="dash-protocols">
            <h4>Supported Protocols</h4>
            <div className="dash-protocol-list">
              {PROTOCOLS.map((proto) => (
                <span className="dash-protocol-badge" data-proto={proto} key={proto}>{proto}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="dash-iot-right">
          <ACPanel />
          <LEDPanel />
        </div>
      </div>
    </div>
  );
}
