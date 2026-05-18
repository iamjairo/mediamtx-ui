import Setting from "./Setting.js";

export default class MetricsSettings extends Setting {
    constructor(settings) {
        super(settings);

        this.storeKey = 'metrics';
        this.fields = [
            'metrics',
            'metricsAddress',
            'metricsEncryption',
            'metricsServerKey',
            'metricsServerCert',
            'metricsAllowOrigins',
            'metricsTrustedProxies'
        ];

    }

    action(action, prop, value) {
        super.action(action, prop, value);

        if (this.settings.created)
            this.settings.service.saveGlobal();
    }
}
