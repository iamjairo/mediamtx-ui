export default class PathItemProxy {
    constructor(data, key, callbacks) {
        this.options = {};
        this.inputType = {};

        this.proxy = new Proxy(data, {
            get: (target, prop) => {
                if (prop === 'keys') {
                    return () => Object.keys(target);
                }
                if (prop === '_') {
                    return this;
                }
                return target[prop];
            },

            set: (target, prop, value) => {
                if (JSON.stringify(target[prop]) === JSON.stringify(value)) {
                    callbacks.onSkip({storeKey: 'paths', index: key, prop, value});
                    return true;
                }

                target[prop] = value;
                callbacks.onUpdate({storeKey: 'paths', index: key, prop, value});
                return true;
            }
        });

        return this.proxy;
    }
}
