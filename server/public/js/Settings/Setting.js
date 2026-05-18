import EventEmitter from "../event_emitter.js";
import DataProxy from "../data_proxy.js";

export default class Setting {
    constructor(settings, target = {}) {
        this.debug = false;
        this.label = this.constructor.name.toUpperCase();
        this.settings = settings;
        this.events = this.settings.events || new EventEmitter();
        this.data = new DataProxy(target, this, false);
        this.options = {};
        this.inputType = {};
    }

    action(action, prop, value) {
        if (this.debug) {
            action === 'create' ? console.log(this.label, 'CREATED +', prop) : null;
            action === 'update' ? console.log(this.label, 'UPDATED >', prop, value) : null;
            action === 'delete' ? console.log(this.label, 'DELETED !', prop) : null;
        }
        this.emit(action, prop, value);
        this.settings.action(action, prop, value);
    }

    setFields() {
        this.fields.forEach(field => this.data[field] = this.source[field]);
    }

    getType(value) {
        return Array.isArray(value) ? 'array' : typeof value;
    }

    onUpdate(result) {
        this.settings.onUpdate({storeKey: this.storeKey, ...result});
    }

    onSkip(result) {
        this.settings.onSkip({storeKey: this.storeKey, ...result});
    }

    on(event, callback) {
        return this.events.on(event, callback);
    }

    emit(event, ...args) {
        return this.events.emit(event, ...args);
    }
}
