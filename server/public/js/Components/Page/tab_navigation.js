import EventEmitter from "../../event_emitter.js";

export default class TabNavigation {
    constructor(page) {
        this.page = page;
        this.events = this.page.events || new EventEmitter();

        this.tabs = [
            {name: "Overview", slug: "overview", icon: 'armchair', section: 'main'},
            {name: "Streams", slug: "streams", icon: 'expand', section: 'main'},
            {name: "Server", slug: "server", icon: 'settings', section: 'config'},
            {name: "Path Defaults", slug: "path", icon: 'layers-2', section: 'config'},
            {name: "Users", slug: "users", icon: 'user', section: 'config'},
        ];
    }

    render() {
        this.renderSidebar();
        this.renderHeader();

        if (!this.selected) {
            this.selected = this.tabs[0].slug;
        } else {
            this.selected = this.selected;
        }

        this.startClock();
    }

    renderSidebar() {
        this.sidebar = document.createElement("aside");
        this.sidebar.className = "sidebar";

        const brand = document.createElement("div");
        brand.className = "brand";
        brand.innerHTML = `
            <div class="brand-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
            </div>
            <span class="brand-name">MediaMTX</span>
            <span class="brand-version">v2.0</span>
        `;
        this.sidebar.appendChild(brand);

        const nav = document.createElement("nav");

        const sections = {
            main: 'Dashboard',
            config: 'Configuration',
        };

        this.buttons = [];

        Object.entries(sections).forEach(([key, label]) => {
            const section = document.createElement("div");
            section.className = "nav-section";

            const sectionLabel = document.createElement("div");
            sectionLabel.className = "nav-section-label";
            sectionLabel.textContent = label;
            section.appendChild(sectionLabel);

            const sectionTabs = this.tabs.filter(t => t.section === key);
            sectionTabs.forEach(tab => {
                const button = document.createElement("button");
                button.className = "nav-item";
                if (tab.disabled) button.classList.add("disabled");
                button.setAttribute("type", "button");

                const iconSvg = this.icons.svg[tab.icon] || '';
                button.innerHTML = `${iconSvg}<span>${tab.name}</span>`;
                button.slug = tab.slug;

                if (!tab.disabled) {
                    button.onclick = () => this.selected = tab.slug;
                } else {
                    button.style.opacity = '0.4';
                    button.style.cursor = 'default';
                }

                section.appendChild(button);
                this.buttons.push(button);
            });

            nav.appendChild(section);
        });

        this.sidebar.appendChild(nav);

        const footer = document.createElement("div");
        footer.className = "sidebar-footer";
        footer.innerHTML = `
            <div class="status-indicator">
                <span class="status-dot"></span>
                <span>MediaMTX Connected</span>
            </div>
        `;

        const logoutBtn = document.createElement("button");
        logoutBtn.className = "logout-btn";
        logoutBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Logout</span>
        `;
        logoutBtn.onclick = async () => {
            await this.page.auth.logout();
            this.page.eject();
        };
        footer.appendChild(logoutBtn);

        this.sidebar.appendChild(footer);
        this.page.element.prepend(this.sidebar);
    }

    renderHeader() {
        this.header = document.createElement("div");
        this.header.className = "top-header";

        this.headerLeft = document.createElement("div");
        this.headerLeft.className = "header-left";
        this.headerTitle = document.createElement("span");
        this.headerTitle.className = "page-title";
        this.headerTitle.textContent = "Dashboard";
        this.headerLeft.appendChild(this.headerTitle);

        this.headerRight = document.createElement("div");
        this.headerRight.className = "header-right";

        this.clockEl = document.createElement("div");
        this.clockEl.className = "clock";
        this.headerRight.appendChild(this.clockEl);

        this.header.appendChild(this.headerLeft);
        this.header.appendChild(this.headerRight);
        this.page.element.appendChild(this.header);

        this.contentWrapper = document.createElement("div");
        this.contentWrapper.className = "main-content";
        this.page.element.appendChild(this.contentWrapper);
    }

    startClock() {
        const updateClock = () => {
            const now = new Date();
            const time = now.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: false});
            const date = now.toLocaleDateString('en-US', {day: 'numeric', month: 'short'});
            this.clockEl.innerHTML = `${time} <span class="clock-date">${date}</span>`;
        };
        updateClock();
        this.clockInterval = setInterval(updateClock, 1000);
    }

    on(event, callback) {
        return this.events.on(event, callback);
    }

    emit(event, ...args) {
        return this.events.emit(event, ...args);
    }

    destroy() {
        clearInterval(this.clockInterval);
        this.sidebar?.remove();
        this.header?.remove();
        this.contentWrapper?.remove();
    }

    get selected() {
        return this._selected;
    }

    set selected(val) {
        this._selected = val;

        this.page.fm.abortAll();
        window.history.pushState({}, "", `#${this.selected}`);
        this.buttons.forEach(b => b.classList.remove("active"));
        const activeBtn = this.buttons.find(b => b.slug === this.selected);
        if (activeBtn) activeBtn.classList.add("active");

        const tabConfig = this.tab;
        if (tabConfig && this.headerTitle) {
            this.headerTitle.textContent = tabConfig.name;
        }

        this.page.showTab(this.tab);
    }

    get tab() {
        return this.tabs.find(tab => tab.slug === this.selected);
    }

    set tab(val) {}

    get icons() {
        return this.page.icons;
    }

    set icons(val) {}
}
