import Setting from "./Setting.js";

export default class RTMPSettings extends Setting {
    constructor(settings) {
        super(settings);

        this.debug = false;
        this.storeKey = 'rtmp';
        this.fields = [
            'rtmp',
            'rtmpAddress',
            'rtmpEncryption',
            'rtmpsAddress',
            'rtmpServerKey',
            'rtmpServerCert'
        ];

        this.options = {
            'rtmpEncryption': ['no', 'strict', 'optional']
        }

    }

    action(action, prop, value) {
        super.action(action, prop, value);

        if (this.settings.created)
            this.settings.service.saveGlobal();
    }
}
