import FormItem from "../FormItem.js";
import GroupNavigation from "../Page/group_navigation.js";
import PathGroups from "../Page/path_groups.js";

export default class StreamItem {
    constructor(options) {
        this.label = this.constructor.name.toUpperCase();

        this.tab = options.tab;
        this.page = this.tab.page;
        this.store = this.tab.store;

        this.groups = PathGroups;
        this.name = options.name;
        this.data = options.data;

        this.schema = options.schema ?? {fields: [], options: {}, inputTypes: {}, locked: []};

        this.items = {};
        this.render();
    }

    render() {
        this.destroy();

        this.element = document.createElement("div");
        this.element.className = "path";

        // Collapse toggle button — placed directly on .path so it's positioned
        // relative to the outer card (position: relative on .path)
        this.collapseToggle = document.createElement("button");
        this.collapseToggle.className = 'collapse-toggle';
        this.collapseToggle.innerHTML = '&#9660; Collapse';
        this.collapseToggle.onclick = () => this.toggleCollapse();
        this.element.append(this.collapseToggle);

        // --- Left side: path-main ---
        this.mainElement = document.createElement("div");
        this.mainElement.className = "path-main";
        this.element.append(this.mainElement);

        // Delete-Button
        const deleteButton = document.createElement("button");
        deleteButton.className = 'delete';
        deleteButton.innerHTML = `${this.page.icons.svg['list-minus']} Delete path`;
        deleteButton.onclick = () => this.delete();
        this.mainElement.append(deleteButton);

        // Navigation
        this.navigation = new GroupNavigation(this, () => this.renderGroup());
        this.navigation.render();
        this.navigation.select('source');
        this.mainElement.append(this.navigation.element);

        // Name-Field
        const store = this.data;
        const options = this.schema.options || {};
        const inputTypes = this.schema.inputType || {};
        const locks = this.schema.locked || [];

        // name form item
        const nameItem = new FormItem({
            parent: this,
            store: store,
            prop: 'name',
            inputType: inputTypes['name'] || false,
            values: options['name'] || false,
            locked: locks.includes('name'),
            elementOptions: {
                className: 'form-item name'
            }
        });

        const sourceItem = new FormItem({
            parent: this,
            store: store,
            prop: 'source',
            inputType: inputTypes['source'] || false,
            values: options['source'] || false,
            locked: locks.includes('source'),
            elementOptions: {
                className: 'form-item source'
            }
        });

        this.items.name = nameItem;
        this.items.source = sourceItem;
        this.mainElement.append(nameItem.element);
        this.mainElement.append(sourceItem.element);

        // --- Right side: path-preview ---
        this.previewElement = document.createElement("div");
        this.previewElement.className = "path-preview";
        this.element.append(this.previewElement);

        this.renderPreviewCard();

        return this.element;
    }

    renderPreviewCard() {
        const streamName = this.name || 'stream';
        const sourceVal = (this.data && this.data.source) ? this.data.source : 'publisher';

        const card = document.createElement("div");
        card.className = "stream-preview-card";

        // Video area with placeholder
        const videoArea = document.createElement("div");
        videoArea.className = "preview-video-area";

        const placeholder = document.createElement("div");
        placeholder.className = "preview-placeholder";

        const camIcon = document.createElement("div");
        camIcon.className = "preview-cam-icon";
        camIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 7l-7 5 7 5V7z"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>`;

        const readyLabel = document.createElement("span");
        readyLabel.textContent = "Stream Ready";

        placeholder.append(camIcon, readyLabel);
        videoArea.append(placeholder);
        card.append(videoArea);

        // Info rows
        const infoDiv = document.createElement("div");
        infoDiv.className = "preview-info";

        const rows = [
            { label: 'Name', value: streamName, cls: 'preview-value' },
            { label: 'Protocol', value: sourceVal, cls: 'preview-value' },
            { label: 'Status', value: 'Live', cls: 'preview-value-status' }
        ];

        rows.forEach(({ label, value, cls }) => {
            const row = document.createElement("div");
            row.className = "preview-info-row";

            const labelSpan = document.createElement("span");
            labelSpan.className = "preview-label";
            labelSpan.textContent = label;

            const valueSpan = document.createElement("span");
            valueSpan.className = cls;
            valueSpan.textContent = value;

            row.append(labelSpan, valueSpan);
            infoDiv.append(row);
        });

        // Keep protocol and status value spans accessible for updates
        this._previewNameSpan = infoDiv.querySelectorAll('.preview-value')[0];
        this._previewProtocolSpan = infoDiv.querySelectorAll('.preview-value')[1];

        card.append(infoDiv);
        this.previewElement.append(card);
    }

    renderGroup() {
        this.items = {};
        this.groupsElement?.remove();

        const store = this.data;
        const options = this.schema.options || {};
        const inputTypes = this.schema.inputType || {};
        const locks = this.schema.locked || [];

        this.groupsElement = document.createElement("div");
        this.groupsElement.className = "groups";
        this.mainElement.append(this.groupsElement);

        if (this.group.columns) {
            this.group.columns.forEach(col => {
                const groupElement = document.createElement("div");
                groupElement.className = "group";

                if (col.props) {
                    col.props.forEach(prop => {
                        if (prop === 'source')
                            return;

                        const item = new FormItem({
                            parent: this,
                            store: store,
                            prop: prop,
                            inputType: inputTypes[prop] || false,
                            values: options[prop] || false,
                            locked: locks.includes(prop),
                            elementOptions: {}
                        });

                        groupElement.append(item.element);
                        this.items[prop] = item;
                    });
                }

                this.groupsElement.append(groupElement);
            });
        }

        if (this.group.props) {
            const groupElement = document.createElement("div");
            groupElement.className = "group fields";
            this.group.props.forEach(prop => {
                const item = new FormItem({
                    parent: this,
                    store: store,
                    prop: prop,
                    inputType: inputTypes[prop] || false,
                    values: options[prop] || false,
                    locked: locks.includes(prop),
                    elementOptions: {}
                });
                groupElement.append(item.element);
                this.items[prop] = item;
            });
            this.groupsElement.append(groupElement);
        }
    }

    toggleCollapse() {
        const isCollapsed = this.element.classList.toggle('collapsed');
        if (isCollapsed) {
            this.collapseToggle.innerHTML = '&#9654; Expand';
        } else {
            this.collapseToggle.innerHTML = '&#9660; Collapse';
        }
    }

    collapse() {
        // Legacy method kept for compatibility — now just toggles
        this.toggleCollapse();
    }

    expand() {
        this.element.classList.remove('collapsed');
        this.collapseToggle.innerHTML = '&#9660; Collapse';
    }

    delete() {
        this.tab.deletePath(this.name);
    }

    destroy() {
        this.groupsElement?.remove();
        this.navigation?.destroy?.();
        this.element?.remove();
        this.items = {};
    }
}
