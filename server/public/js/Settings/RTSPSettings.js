import Setting from "./Setting.js";

export default class RTSPSettings extends Setting {
    constructor(settings) {
        super(settings);

        this.debug = false;
        this.storeKey = 'rtsp';
        this.fields = [
            'rtsp',
            'rtspTransports',
            'rtspEncryption',
            'rtspAddress',
            'rtspsAddress',
            'rtpAddress',
            'rtcpAddress',
            'multicastIPRange',
            'multicastRTPPort',
            'multicastRTCPPort',
            'srtpAddress',
            'srtcpAddress',
            'multicastSRTPPort',
            'multicastSRTCPPort',
            'rtspServerKey',
            'rtspServerCert',
            'rtspAuthMethods',
        ];

        this.options = {
            'rtspEncryption': ['no', 'strict', 'optional'],
            'rtspTransports': ['multicast', 'tcp', 'udp'],
            'rtspAuthMethods': ['basic', 'digest']
        }

    }

    action(action, prop, value) {
        super.action(action, prop, value);

        if (this.settings.created)
            this.settings.service.saveGlobal();
    }
}
