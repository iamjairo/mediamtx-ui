import Setting from "./Setting.js";

export default class PPROFSettings extends Setting {
    constructor(settings) {
        super(settings);

        this.storeKey = 'pprof';
        this.fields = [
            'pprof',
            'pprofAddress',
            'pprofEncryption',
            'pprofServerKey',
            'pprofServerCert',
            'pprofAllowOrigins',
            'pprofTrustedProxies'
        ];

    }

    action(action, prop, value) {
        super.action(action, prop, value);

        if (this.settings.created)
            this.settings.service.saveGlobal();
    }
}
