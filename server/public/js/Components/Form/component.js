export default class Component {
    constructor(options = {}) {
        this.parent = options.parent;
        this.storeKey = options.storeKey;
        this.store = options.store;
        this.prop = options.prop;
        this.name = `${options.prop}`.toLowerCase();
        this.inputType = options.inputType;
        this.values = options.values;
        this.locked = options.locked;
        this.options = options.elementOptions || {};

        this.debounceTime = 50;

        this.targetElement = this.parent?.element || false;
        this.elementTag = 'div';
        this.elementProps = {
            className: 'item'
        };
    }

    init() {
        Object.assign(this.elementProps, this.options);
    }

    render() {
        this.element = document.createElement(this.elementTag);
        Object.keys(this.elementProps).forEach(prop => prop !== 'dataset' ? this.element[prop] = this.elementProps[prop] : null);
        this.elementProps.dataset ? Object.keys(this.elementProps.dataset).forEach(dataKey => this.element.dataset[dataKey] = this.elementProps.dataset[dataKey]) : null;
    }

    setValue(value) {
        this.element.value = value;
    }

    get value() {
        return this.store[this.prop];
    }

    set value(value) {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.store[this.prop] = value, this.debounceTime);
    }

    get dataType() {
        return Array.isArray(this.value) ? 'array' : typeof this.value;
    }

    set dataType(val) {
        // read-only
    }

    get dataTypeValues() {
        return Array.isArray(this.values) ? 'array' : typeof this.values;
    }

    set dataTypeValues(val) {
        // read-only
    }
}