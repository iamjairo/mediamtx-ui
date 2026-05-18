import Setting from "./Setting.js";

export default class GeneralSettings extends Setting {
    constructor(settings) {
        super(settings);

        this.debug = false;
        this.storeKey = 'general';
        this.fields = [
            'logLevel',
            'logDestinations',
            'logFile',
            'sysLogPrefix',
            'readTimeout',
            'writeTimeout',
            'writeQueueSize',
            'udpMaxPayloadSize',
            'udpReadBufferSize',
            'runOnConnect',
            'runOnConnectRestart',
            'runOnDisconnect'
        ];

        this.options = {
            'logLevel': ['debug', 'info', 'warn', 'error'],
            'logDestinations': ['stdout', 'file']
        }

    }

    action(action, prop, value) {
        super.action(action, prop, value);

        if (this.settings.created)
            this.settings.service.saveGlobal();
    }
}
