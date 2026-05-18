import Setting from "./Setting.js";

export default class PathsSettings extends Setting {
    constructor(settings) {
        super(settings);

        this.debug = false;
        this.storeKey = 'paths';

    }

    action(action, prop, value) {
        super.action(action, prop, value);
    }
}
