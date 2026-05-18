import Setting from "./Setting.js";

export default class HLSSettings extends Setting {
    constructor(settings) {
        super(settings);

        this.debug = false;
        this.storeKey = 'hls';
        this.fields = [
            'hls',
            'hlsAddress',
            'hlsEncryption',
            'hlsServerKey',
            'hlsServerCert',
            'hlsAllowOrigins',
            'hlsTrustedProxies',
            'hlsAlwaysRemux',
            'hlsVariant',
            'hlsSegmentCount',
            'hlsSegmentDuration',
            'hlsPartDuration',
            'hlsSegmentMaxSize',
            'hlsDirectory',
            'hlsMuxerCloseAfter',
        ];

        this.options = {
            'hlsVariant': ['mpegts', 'fmp4', 'lowLatency']
        }

    }

    action(action, prop, value) {
        super.action(action, prop, value);

        if (this.settings.created)
            this.settings.service.saveGlobal();
    }
}
