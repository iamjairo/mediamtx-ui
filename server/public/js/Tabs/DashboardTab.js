import Tab from "./Tab.js";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ROOMS = [
    { id: "entrance", name: "Entrance", icon: "door", active: false },
    { id: "backyard", name: "Backyard", icon: "sun", active: false },
    { id: "workstation", name: "My Workstation", icon: "zap", active: true },
    { id: "living", name: "Living Room", icon: "tv", active: false },
    { id: "front", name: "Front Room", icon: "home", active: false },
];

const ENV_PRESETS = [
    { id: "music", label: "Listen to Music", icon: "music" },
    { id: "relax", label: "Cool and Relax", icon: "moon" },
    { id: "night", label: "Good Night", icon: "sun" },
    { id: "arrive", label: "Arrive Home", icon: "home" },
];

const ROOM_ICONS = {
    door: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/></svg>',
    sun: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
    zap: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>',
    tv: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>',
    home: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    music: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    moon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    plus: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    wind: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>',
    settings: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
};

export default class DashboardTab extends Tab {
    constructor(page) {
        super(page);
        this.streams = [];
        this.logEvents = [];
        this.caddyStatus = null;
        this.dockerContainers = [];
        this.refreshInterval = null;
        this.activeRoom = "workstation";
        this.activePreset = "relax";
        this.acTemp = 15;
        this.brightness = 35;
        this.ledOn = true;
        this.activeEffect = 2;
    }

    async render() {
        this.element = document.createElement("div");
        this.element.className = "tab dashboard";
        this.page.contentWrapper.append(this.element);

        await this.loadData();

        this.renderWelcome();
        this.renderStatCards();

        // 3-column IoT layout
        const layout = document.createElement("div");
        layout.className = "dash-iot-layout";

        const left = document.createElement("div");
        left.className = "dash-iot-left";

        const center = document.createElement("div");
        center.className = "dash-iot-center";

        const right = document.createElement("div");
        right.className = "dash-iot-right";

        this.renderRooms(left);
        this.renderEnvironment(left);
        this.renderWeather(left);

        this.renderGrid(center);
        this.renderStreamOverview(center);
        this.renderMetrics(center);
        this.renderProtocols(center);

        this.renderAC(right);
        this.renderLED(right);

        layout.append(left, center, right);
        this.element.appendChild(layout);

        this.refreshInterval = setInterval(() => this.refresh(), 10000);
    }

    async loadData() {
        try {
            const res = await this.fm.fetch('/mediamtx/paths/list');
            if (res?.ok) {
                const data = await res.json();
                this.streams = data.items || [];
            }
        } catch (e) {
            this.streams = [];
        }

        try {
            const res = await this.fm.fetch('/api/caddy/status');
            if (res?.ok) {
                this.caddyStatus = await res.json();
            }
        } catch (e) {
            this.caddyStatus = null;
        }

        try {
            const res = await this.fm.fetch('/api/docker/containers');
            if (res?.ok) {
                const data = await res.json();
                this.dockerContainers = data.containers || data || [];
            }
        } catch (e) {
            this.dockerContainers = [];
        }
    }

    async refresh() {
        await this.loadData();
        this.updateStatCards();
        this.updateConnectivity();
        this.updateStreamOverview();
    }

    // =========================================================================
    // Welcome banner
    // =========================================================================
    renderWelcome() {
        const isOnline = this.streams !== null;
        this.welcomeEl = document.createElement("div");
        this.welcomeEl.className = "dash-welcome";

        this.statusBanner = document.createElement("div");
        this.statusBanner.className = "dash-status-banner" + (isOnline ? "" : " offline");
        this.statusBanner.textContent = isOnline ? "SYSTEM ONLINE" : "SYSTEM OFFLINE";
        this.welcomeEl.appendChild(this.statusBanner);

        const h2 = document.createElement("h2");
        h2.textContent = "Welcome back";
        this.welcomeEl.appendChild(h2);

        const p = document.createElement("p");
        p.textContent = "MediaMTX Dashboard — Stream Management Hub";
        this.welcomeEl.appendChild(p);

        this.element.appendChild(this.welcomeEl);
    }

    // =========================================================================
    // Stat cards
    // =========================================================================
    renderStatCards() {
        this.statsRowEl = document.createElement("div");
        this.statsRowEl.className = "dash-stats-row";

        const cards = [
            { icon: "📡", valueKey: "streamCount", label: "Active Streams", sub: "paths configured" },
            { icon: "🖥️", valueKey: "serverCount", label: "Servers", sub: "connected" },
            { icon: "🎥", valueKey: "cameraWall", label: "Camera Wall", sub: "viewer" },
            { icon: "💚", valueKey: "systemHealth", label: "System Health", sub: "status" },
        ];

        this.statCardEls = {};

        cards.forEach(card => {
            const cardEl = document.createElement("div");
            cardEl.className = "dash-stat-card";

            const iconEl = document.createElement("div");
            iconEl.className = "dash-stat-icon";
            iconEl.textContent = card.icon;

            const valueEl = document.createElement("div");
            valueEl.className = "dash-stat-value";
            valueEl.textContent = this.getStatValue(card.valueKey);

            const labelEl = document.createElement("div");
            labelEl.className = "dash-stat-label";
            labelEl.textContent = card.label;

            const subEl = document.createElement("div");
            subEl.className = "dash-stat-sub";
            subEl.textContent = card.sub;

            cardEl.append(iconEl, valueEl, labelEl, subEl);
            this.statCardEls[card.valueKey] = valueEl;
            this.statsRowEl.appendChild(cardEl);
        });

        this.element.appendChild(this.statsRowEl);
    }

    getStatValue(key) {
        switch (key) {
            case "streamCount": return String(this.streams.length);
            case "serverCount": return String(this.getServerCount());
            case "cameraWall": return this.streams.length > 0 ? "Active" : "Idle";
            case "systemHealth": return "Nominal";
            default: return "—";
        }
    }

    getServerCount() {
        let count = 1;
        if (this.caddyStatus?.running) count++;
        if (this.dockerContainers.length > 0) count++;
        return count;
    }

    updateStatCards() {
        if (!this.statCardEls) return;
        Object.keys(this.statCardEls).forEach(key => {
            this.statCardEls[key].textContent = this.getStatValue(key);
        });
    }

    // =========================================================================
    // My Rooms (left sidebar)
    // =========================================================================
    renderRooms(parent) {
        const card = this.iotCard("My Rooms");
        const grid = document.createElement("div");
        grid.className = "iot-rooms-grid";

        ROOMS.forEach(room => {
            const btn = document.createElement("button");
            btn.className = "iot-room-btn" + (room.id === this.activeRoom ? " active" : "");
            btn.onclick = () => {
                this.activeRoom = room.id;
                grid.querySelectorAll('.iot-room-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };

            const iconWrap = document.createElement("div");
            iconWrap.className = "iot-room-icon";
            iconWrap.innerHTML = ROOM_ICONS[room.icon] || ROOM_ICONS.home;

            const name = document.createElement("span");
            name.className = "iot-room-name";
            name.textContent = room.name;

            btn.append(iconWrap, name);
            grid.appendChild(btn);
        });

        const addBtn = document.createElement("button");
        addBtn.className = "iot-room-add";
        addBtn.innerHTML = `${ROOM_ICONS.plus}<span>Add new</span>`;
        grid.appendChild(addBtn);

        card.appendChild(grid);
        parent.appendChild(card);
    }

    // =========================================================================
    // Set Room Environment (left sidebar)
    // =========================================================================
    renderEnvironment(parent) {
        const card = this.iotCard("Set Room Environment");
        const grid = document.createElement("div");
        grid.className = "iot-env-grid";

        ENV_PRESETS.forEach(preset => {
            const btn = document.createElement("button");
            btn.className = "iot-env-btn" + (preset.id === this.activePreset ? " active" : "");
            btn.onclick = () => {
                this.activePreset = preset.id;
                grid.querySelectorAll('.iot-env-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };

            const iconWrap = document.createElement("div");
            iconWrap.className = "iot-env-icon";
            iconWrap.innerHTML = ROOM_ICONS[preset.icon] || '';

            const label = document.createElement("span");
            label.className = "iot-env-label";
            label.textContent = preset.label;

            btn.append(iconWrap, label);
            grid.appendChild(btn);
        });

        card.appendChild(grid);
        parent.appendChild(card);
    }

    // =========================================================================
    // Weather (left sidebar)
    // =========================================================================
    renderWeather(parent) {
        const card = this.iotCard("Weather", "Today");
        card.classList.add("iot-weather");

        // Background blobs
        const blob1 = document.createElement("div");
        blob1.className = "weather-blob-1";
        const blob2 = document.createElement("div");
        blob2.className = "weather-blob-2";
        card.append(blob1, blob2);

        // Main display
        const main = document.createElement("div");
        main.className = "weather-main";

        // Cloud + lightning + rain
        const cloudWrap = document.createElement("div");
        cloudWrap.className = "weather-cloud-wrap";
        cloudWrap.innerHTML = `
            <svg class="cloud-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
            </svg>
            <div class="weather-lightning">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/>
                    <path d="m13 12-3 5h4l-3 5"/>
                </svg>
            </div>
        `;

        // Rain drops
        const rain = document.createElement("div");
        rain.className = "weather-rain";
        for (let i = 0; i < 5; i++) {
            const drop = document.createElement("div");
            drop.className = "rain-drop";
            drop.style.animationDelay = `${i * 0.15}s`;
            rain.appendChild(drop);
        }
        cloudWrap.appendChild(rain);
        main.appendChild(cloudWrap);

        // Temperature
        const tempWrap = document.createElement("div");
        tempWrap.className = "weather-temp";
        tempWrap.innerHTML = `
            <div class="weather-temp-value">23<sup>°</sup></div>
            <div class="weather-condition">Thunderclouds</div>
            <div class="weather-meta">
                <span class="weather-meta-item"><svg class="cyan" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg> 13 km/h</span>
                <span class="weather-meta-item"><svg class="blue" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg> 24%</span>
                <span class="weather-meta-item"><svg class="sky" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg> 87%</span>
            </div>
        `;
        main.appendChild(tempWrap);
        card.appendChild(main);

        // Hourly forecast
        const h = new Date().getHours();
        const hourlyData = [
            { time: `${h}:00`, temp: 23, icon: "thunder", active: true },
            { time: `${h + 1}:00`, temp: 21, icon: "rain", active: false },
            { time: `${h + 2}:00`, temp: 22, icon: "rain", active: false },
            { time: `${h + 3}:00`, temp: 19, icon: "wind", active: false },
        ];

        const hourly = document.createElement("div");
        hourly.className = "weather-hourly";

        hourlyData.forEach(item => {
            const slot = document.createElement("div");
            slot.className = "weather-hour" + (item.active ? " active" : "");

            const tempEl = document.createElement("span");
            tempEl.className = "weather-hour-temp";
            tempEl.textContent = `${item.temp}°`;

            const iconEl = document.createElement("span");
            if (item.icon === "thunder") {
                iconEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + (item.active ? '#fff' : '#facc15') + '" stroke-width="2"><path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/></svg>';
            } else if (item.icon === "rain") {
                iconEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + (item.active ? '#fff' : '#38bdf8') + '" stroke-width="2"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>';
            } else {
                iconEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + (item.active ? '#fff' : '#22d3ee') + '" stroke-width="2"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>';
            }

            const timeEl = document.createElement("span");
            timeEl.className = "weather-hour-time";
            timeEl.textContent = item.time;

            slot.append(tempEl, iconEl, timeEl);
            hourly.appendChild(slot);
        });

        card.appendChild(hourly);

        // 7-day forecast
        const weekly = document.createElement("div");
        weekly.className = "weather-weekly";
        const today = (new Date().getDay() + 6) % 7;

        WEEK_DAYS.forEach((day, i) => {
            const offset = (i - today + 7) % 7;
            const row = document.createElement("div");
            row.className = "weather-day";

            const nameEl = document.createElement("span");
            nameEl.className = "weather-day-name";
            nameEl.textContent = offset === 0 ? "Today" : day;

            const iconWrap = document.createElement("div");
            iconWrap.className = "weather-day-icon";
            if (i % 3 === 0) {
                iconWrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg><span class="label">Rainy</span>';
            } else if (i % 3 === 1) {
                iconWrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2"><path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/></svg><span class="label">Storm</span>';
            } else {
                iconWrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg><span class="label">Cloudy</span>';
            }

            const temps = document.createElement("span");
            temps.className = "weather-day-temps";
            const hi = 20 + Math.floor(Math.random() * 6);
            const lo = 13 + Math.floor(Math.random() * 5);
            temps.innerHTML = `+${hi}° <span class="low">+${lo}°</span>`;

            row.append(nameEl, iconWrap, temps);
            weekly.appendChild(row);
        });

        card.appendChild(weekly);
        parent.appendChild(card);
    }

    // =========================================================================
    // A/C Dial (right sidebar)
    // =========================================================================
    renderAC(parent) {
        const card = this.iotCard("Air Conditioner");
        const content = document.createElement("div");
        content.className = "iot-ac-content";

        content.appendChild(this.buildDial({
            value: this.acTemp,
            max: 30,
            label: "Temperature",
            unit: "°C",
            color: "#8b5cf6",
            colorClass: "purple",
            size: 130,
            ticks: 24,
            arcFraction: 0.75,
        }));

        const stats = document.createElement("div");
        stats.className = "iot-ac-stats";

        const swingStat = document.createElement("div");
        swingStat.className = "iot-ac-stat";
        swingStat.innerHTML = `<div class="iot-ac-stat-label">Swing Mode</div><div class="iot-ac-stat-value green">Up & Down</div>`;

        const windStat = document.createElement("div");
        windStat.className = "iot-ac-stat";
        windStat.innerHTML = `<div class="iot-ac-stat-label">Wind Level</div><div class="iot-ac-stat-value amber">${ROOM_ICONS.wind} 54%</div>`;

        stats.append(swingStat, windStat);
        content.appendChild(stats);
        card.appendChild(content);
        parent.appendChild(card);
    }

    // =========================================================================
    // LED Strips (right sidebar)
    // =========================================================================
    renderLED(parent) {
        const card = this.iotCard("LED Strips Light");
        const content = document.createElement("div");
        content.className = "iot-led-content";

        const dialWrap = document.createElement("div");
        dialWrap.style.position = "relative";

        dialWrap.appendChild(this.buildDial({
            value: this.ledOn ? this.brightness : 0,
            max: 100,
            label: "Brightness",
            unit: "%",
            color: "#8b5cf6",
            colorClass: "purple",
            size: 140,
            ticks: 20,
            arcFraction: 0.8,
        }));

        const powerBtn = document.createElement("button");
        powerBtn.className = "iot-led-power";
        powerBtn.innerHTML = ROOM_ICONS.zap;
        powerBtn.onclick = () => {
            this.ledOn = !this.ledOn;
            parent.removeChild(card);
            this.renderLED(parent);
        };
        dialWrap.appendChild(powerBtn);
        content.appendChild(dialWrap);

        const effects = document.createElement("div");
        effects.className = "iot-led-effects";

        const efTitle = document.createElement("span");
        efTitle.className = "iot-led-effects-title";
        efTitle.textContent = "Effects";
        effects.appendChild(efTitle);

        const colors = [
            { cls: "iot-effect-amber" },
            { cls: "iot-effect-green" },
            { cls: "iot-effect-purple" },
        ];

        colors.forEach((c, i) => {
            const btn = document.createElement("button");
            btn.className = `iot-effect-btn ${c.cls}` + (i === this.activeEffect ? " active" : "");
            btn.onclick = () => {
                this.activeEffect = i;
                effects.querySelectorAll('.iot-effect-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
            effects.appendChild(btn);
        });

        content.appendChild(effects);
        card.appendChild(content);
        parent.appendChild(card);
    }

    // =========================================================================
    // SVG Circular Dial builder
    // =========================================================================
    buildDial({ value, max, label, unit, color, colorClass, size, ticks, arcFraction }) {
        const pct = value / max;
        const radius = (size - 16) / 2;
        const circumference = 2 * Math.PI * radius;
        const cx = size / 2;
        const cy = size / 2;
        const strokeDashoffset = circumference * (1 - pct * arcFraction);

        const wrap = document.createElement("div");
        wrap.className = "iot-dial-wrap";
        wrap.style.width = `${size}px`;
        wrap.style.height = `${size}px`;

        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("width", size);
        svg.setAttribute("height", size);

        // Background arc
        const bgCircle = document.createElementNS(ns, "circle");
        bgCircle.setAttribute("cx", cx);
        bgCircle.setAttribute("cy", cy);
        bgCircle.setAttribute("r", radius);
        bgCircle.setAttribute("class", "iot-dial-bg");
        bgCircle.setAttribute("stroke-dasharray", `${circumference * arcFraction} ${circumference * (1 - arcFraction)}`);
        svg.appendChild(bgCircle);

        // Progress arc
        const progressCircle = document.createElementNS(ns, "circle");
        progressCircle.setAttribute("cx", cx);
        progressCircle.setAttribute("cy", cy);
        progressCircle.setAttribute("r", radius);
        progressCircle.setAttribute("class", "iot-dial-progress");
        progressCircle.setAttribute("stroke", color);
        progressCircle.setAttribute("stroke-dasharray", `${circumference * arcFraction} ${circumference}`);
        progressCircle.setAttribute("stroke-dashoffset", strokeDashoffset);
        svg.appendChild(progressCircle);

        // Tick marks
        for (let i = 0; i < ticks; i++) {
            const angleRange = arcFraction * 360;
            const startAngle = -90 - (angleRange / 2);
            const angle = startAngle + (i / (ticks - 1)) * angleRange;
            const rad = (angle * Math.PI) / 180;
            const r1 = radius + 10;
            const r2 = radius + 16;
            const x1 = cx + r1 * Math.cos(rad);
            const y1 = cy + r1 * Math.sin(rad);
            const x2 = cx + r2 * Math.cos(rad);
            const y2 = cy + r2 * Math.sin(rad);

            const tick = document.createElementNS(ns, "line");
            tick.setAttribute("x1", x1);
            tick.setAttribute("y1", y1);
            tick.setAttribute("x2", x2);
            tick.setAttribute("y2", y2);
            tick.setAttribute("class", "iot-dial-tick");
            svg.appendChild(tick);
        }

        wrap.appendChild(svg);

        // Center text
        const center = document.createElement("div");
        center.className = "iot-dial-center";
        center.innerHTML = `
            <span class="iot-dial-label">${label}</span>
            <span class="iot-dial-value ${colorClass}">${value}${unit}</span>
        `;
        wrap.appendChild(center);

        return wrap;
    }

    // =========================================================================
    // IoT card helper
    // =========================================================================
    iotCard(title, badge) {
        const card = document.createElement("div");
        card.className = "iot-card";

        const header = document.createElement("div");
        header.className = "iot-card-header";

        const titleEl = document.createElement("span");
        titleEl.className = "iot-card-title";
        titleEl.textContent = title;
        header.appendChild(titleEl);

        if (badge) {
            const badgeEl = document.createElement("span");
            badgeEl.className = "iot-card-badge";
            badgeEl.textContent = badge;
            header.appendChild(badgeEl);
        }

        card.appendChild(header);
        return card;
    }

    // =========================================================================
    // Connectivity + Events (center column)
    // =========================================================================
    renderGrid(parent) {
        this.gridEl = document.createElement("div");
        this.gridEl.className = "dash-grid";

        this.renderConnectivity();
        this.renderEventLog();

        parent.appendChild(this.gridEl);
    }

    renderConnectivity() {
        const panel = document.createElement("div");
        panel.className = "dash-panel dash-connectivity";

        const header = document.createElement("div");
        header.className = "dash-panel-header";

        const h3 = document.createElement("h3");
        h3.textContent = "Server Connectivity";

        const configLink = document.createElement("span");
        configLink.className = "dash-panel-link";
        configLink.textContent = "Configure →";
        configLink.onclick = () => this.navigateTo("server");

        header.append(h3, configLink);
        panel.appendChild(header);

        this.serverListEl = document.createElement("div");
        this.serverListEl.className = "dash-server-list";
        this.buildServerRows();
        panel.appendChild(this.serverListEl);

        const addBtn = document.createElement("button");
        addBtn.className = "dash-add-server";
        addBtn.innerHTML = `<span>+</span><span>Add Server Connection</span>`;
        addBtn.onclick = () => this.navigateTo("server");
        panel.appendChild(addBtn);

        this.gridEl.appendChild(panel);
    }

    buildServerRows() {
        this.serverListEl.innerHTML = "";

        const servers = [
            { name: "MediaMTX", detail: this.page.settings?.serverUrl || "localhost", online: true },
            { name: "Go2RTC", detail: "RTSP / WebRTC relay", online: false },
            { name: "Caddy", detail: this.caddyStatus?.version ? `v${this.caddyStatus.version}` : "Reverse proxy", online: this.caddyStatus?.running === true },
            { name: "Docker", detail: `${this.dockerContainers.length} container(s)`, online: this.dockerContainers.length > 0 },
        ];

        servers.forEach(server => {
            const row = document.createElement("div");
            row.className = "dash-server-row";

            const info = document.createElement("div");
            info.className = "dash-server-info";
            info.innerHTML = `<div class="dash-server-name">${server.name}</div><div class="dash-server-detail">${server.detail}</div>`;

            const statusEl = document.createElement("div");
            statusEl.className = "dash-server-status";
            statusEl.innerHTML = `<span class="status-dot ${server.online ? 'online' : 'offline'}"></span><span>${server.online ? 'Online' : 'Offline'}</span>`;

            row.append(info, statusEl);
            this.serverListEl.appendChild(row);
        });
    }

    updateConnectivity() {
        if (this.serverListEl) this.buildServerRows();
    }

    renderEventLog() {
        const panel = document.createElement("div");
        panel.className = "dash-panel dash-events";

        const header = document.createElement("div");
        header.className = "dash-panel-header";

        const h3 = document.createElement("h3");
        h3.textContent = "Event Log";

        const liveBadge = document.createElement("span");
        liveBadge.className = "dash-live-badge";
        liveBadge.textContent = "LIVE";

        header.append(h3, liveBadge);
        panel.appendChild(header);

        this.eventListEl = document.createElement("div");
        this.eventListEl.className = "dash-event-list";
        this.renderEventItems();
        panel.appendChild(this.eventListEl);

        this.eventCountEl = document.createElement("span");
        this.eventCountEl.textContent = `${this.logEvents.length} events`;

        const footer = document.createElement("div");
        footer.className = "dash-event-footer";
        footer.appendChild(this.eventCountEl);

        const clearBtn = document.createElement("button");
        clearBtn.textContent = "Clear log";
        clearBtn.onclick = () => {
            this.logEvents = [];
            this.renderEventItems();
            this.eventCountEl.textContent = "0 events";
        };
        footer.appendChild(clearBtn);

        panel.appendChild(footer);
        this.gridEl.appendChild(panel);

        this.setupEventLogging();
    }

    setupEventLogging() {
        const log = (msg) => {
            const now = new Date();
            const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            this.logEvents.unshift({ time, msg });
            if (this.logEvents.length > 50) this.logEvents.pop();
            this.renderEventItems();
            if (this.eventCountEl) this.eventCountEl.textContent = `${this.logEvents.length} events`;
        };

        log("Dashboard initialized — system online");
        this._eventUnsubStream = this.page.events?.on('streams:update', () => log("Stream list updated"));
        this._eventUnsubError = this.page.events?.on('error', (errMsg) => log(`Error: ${errMsg}`));
    }

    renderEventItems() {
        if (!this.eventListEl) return;
        this.eventListEl.innerHTML = "";

        if (this.logEvents.length === 0) {
            const empty = document.createElement("div");
            empty.className = "dash-event-empty";
            empty.innerHTML = `<div class="dash-event-empty-icon">📋</div><span>No events yet</span>`;
            this.eventListEl.appendChild(empty);
            return;
        }

        this.logEvents.forEach(ev => {
            const item = document.createElement("div");
            item.className = "dash-event-item";
            item.innerHTML = `<span class="dash-event-time">${ev.time}</span><span class="dash-event-msg">${ev.msg}</span>`;
            this.eventListEl.appendChild(item);
        });
    }

    // =========================================================================
    // CCTV Monitor (center column)
    // =========================================================================
    renderStreamOverview(parent) {
        this.streamOverviewEl = document.createElement("div");
        this.streamOverviewEl.className = "dash-stream-overview";

        const header = document.createElement("div");
        header.className = "dash-panel-header";

        const h3 = document.createElement("h3");
        h3.textContent = "CCTV Monitor";

        const manageLink = document.createElement("span");
        manageLink.className = "dash-panel-link";
        manageLink.textContent = "Camera Wall →";
        manageLink.onclick = () => this.navigateTo("camerawall");

        header.append(h3, manageLink);
        this.streamOverviewEl.appendChild(header);

        this.streamPreviewEl = document.createElement("div");
        this.streamPreviewEl.className = "dash-stream-preview";
        this.buildStreamPreview();
        this.streamOverviewEl.appendChild(this.streamPreviewEl);

        parent.appendChild(this.streamOverviewEl);
    }

    buildStreamPreview() {
        if (!this.streamPreviewEl) return;
        this.streamPreviewEl.innerHTML = "";

        const shown = this.streams.slice(0, 4);

        if (shown.length === 0) {
            const empty = document.createElement("div");
            empty.className = "dash-stream-empty";
            empty.innerHTML = `<div class="dash-stream-empty-icon">📺</div><p>No streams configured yet</p>`;
            const btn = document.createElement("button");
            btn.textContent = "Add a Stream";
            btn.onclick = () => this.navigateTo("streams");
            empty.appendChild(btn);
            this.streamPreviewEl.appendChild(empty);
            return;
        }

        const grid = document.createElement("div");
        grid.className = "dash-stream-mini-grid";

        shown.forEach(stream => {
            const card = document.createElement("div");
            card.className = "dash-stream-mini-card";
            card.onclick = () => this.navigateTo("camerawall");

            const thumb = document.createElement("div");
            thumb.className = "dash-stream-thumb";
            thumb.innerHTML = `<div class="dash-stream-thumb-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="15" height="12" rx="2"/><path d="M17 10l4-2.5v9L17 14"/></svg></div>`;

            const statusEl = document.createElement("div");
            statusEl.className = "dash-stream-thumb-status";
            statusEl.textContent = "LIVE";
            thumb.appendChild(statusEl);

            const sourceType = stream.source?.type || '';
            const protoText = sourceType ? this.splitCamelCase(sourceType).toUpperCase().split(' ')[0] : 'RTSP';
            const protoBadge = document.createElement("div");
            protoBadge.className = "dash-stream-thumb-proto";
            protoBadge.textContent = protoText;
            thumb.appendChild(protoBadge);

            card.appendChild(thumb);

            const footer = document.createElement("div");
            footer.className = "dash-stream-mini-footer";
            footer.innerHTML = `<div class="dash-stream-mini-dot"></div><div class="dash-stream-mini-name" title="${stream.name || stream.confName || '—'}">${stream.name || stream.confName || '—'}</div>`;
            card.appendChild(footer);

            grid.appendChild(card);
        });

        if (this.streams.length > 4) {
            const more = document.createElement("div");
            more.className = "dash-stream-mini-card";
            more.style.justifyContent = "center";
            more.style.color = "var(--text-muted-color)";
            more.style.fontSize = "var(--fs-xs)";
            more.textContent = `+${this.streams.length - 4} more`;
            more.onclick = () => this.navigateTo("streams");
            grid.appendChild(more);
        }

        this.streamPreviewEl.appendChild(grid);
    }

    updateStreamOverview() {
        this.buildStreamPreview();
    }

    // =========================================================================
    // Metrics (center column)
    // =========================================================================
    renderMetrics(parent) {
        const row = document.createElement("div");
        row.className = "dash-metrics-row";

        const metrics = [
            { label: "CPU USAGE", icon: "🖥", value: "—", fillPct: 0 },
            { label: "STORAGE USED", icon: "💾", value: "—", fillPct: 0 },
            { label: "BANDWIDTH", icon: "📶", value: "—", fillPct: 0 },
        ];

        metrics.forEach(m => {
            const card = document.createElement("div");
            card.className = "dash-metric-card";
            card.innerHTML = `
                <div class="dash-metric-header"><span class="dash-metric-label">${m.label}</span><span class="dash-metric-icon">${m.icon}</span></div>
                <div class="dash-metric-value">${m.value}</div>
                <div class="dash-metric-bar"><div class="dash-metric-fill" style="width:${m.fillPct}%"></div></div>
            `;
            row.appendChild(card);
        });

        parent.appendChild(row);
    }

    // =========================================================================
    // Protocols (center column)
    // =========================================================================
    renderProtocols(parent) {
        const section = document.createElement("div");
        section.className = "dash-protocols";

        const h4 = document.createElement("h4");
        h4.textContent = "Supported Protocols";
        section.appendChild(h4);

        const list = document.createElement("div");
        list.className = "dash-protocol-list";

        ["WebRTC", "HLS", "LL-HLS", "RTSP", "RTMP", "SRT", "MPEG-TS", "RTP"].forEach(proto => {
            const badge = document.createElement("span");
            badge.className = "dash-protocol-badge";
            badge.setAttribute("data-proto", proto);
            badge.textContent = proto;
            list.appendChild(badge);
        });

        section.appendChild(list);
        parent.appendChild(section);
    }

    // =========================================================================
    // Helpers
    // =========================================================================
    splitCamelCase(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    }

    navigateTo(slug) {
        if (!this.page.tabNavigation) return;
        const tab = this.page.tabNavigation.tabs.find(t => t.slug === slug);
        if (tab) this.page.tabNavigation.selected = tab.slug;
    }

    destroy() {
        clearInterval(this.refreshInterval);
        if (this._eventUnsubStream) this._eventUnsubStream();
        if (this._eventUnsubError) this._eventUnsubError();
        super.destroy();
    }
}
