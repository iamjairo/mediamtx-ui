import Setting from "./Setting.js";

export default class ApiSettings extends Setting {
    constructor(settings) {
        super(settings);

        this.debug = false;
        this.storeKey = 'api';
        this.fields = [
            'api',
            'apiAddress',
            'apiEncryption',
            'apiServerKey',
            'apiServerCert',
            'apiAllowOrigins',
            'apiTrustedProxies'
        ];

    }

    action(action, prop, value) {
        super.action(action, prop, value);

        if (this.settings.created)
            this.settings.service.saveGlobal();
    }
}
