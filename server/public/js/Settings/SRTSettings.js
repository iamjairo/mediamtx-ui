import Setting from "./Setting.js";

export default class SRTSettings extends Setting {
    constructor(settings) {
        super(settings);

        this.storeKey = 'srt';
        this.fields = [
            'srt',
            'srtAddress'
        ];

    }

    action(action, prop, value) {
        super.action(action, prop, value);

        if (this.settings.created)
            this.settings.service.saveGlobal();
    }
}
