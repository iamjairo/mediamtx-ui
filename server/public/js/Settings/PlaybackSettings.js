import Setting from "./Setting.js";

export default class PlaybackSettings extends Setting {
    constructor(settings) {
        super(settings);

        this.storeKey = 'playback';
        this.fields = [
            'playback',
            'playbackAddress',
            'playbackEncryption',
            'playbackServerKey',
            'playbackServerCert',
            'playbackAllowOrigins',
            'playbackTrustedProxies'
        ];

    }

    action(action, prop, value) {
        super.action(action, prop, value);

        if (this.settings.created)
            this.settings.service.saveGlobal();
    }
}
