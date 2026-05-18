import Setting from "./Setting.js";

export default class WebRTCSettings extends Setting {
    constructor(settings) {
        super(settings);

        this.storeKey = 'webrtc';
        this.fields = [
            'webrtc',
            'webrtcAddress',
            'webrtcEncryption',
            'webrtcServerKey',
            'webrtcServerCert',
            'webrtcAllowOrigins',
            'webrtcTrustedProxies',
            'webrtcLocalUDPAddress',
            'webrtcLocalTCPAddress',
            'webrtcIPsFromInterfaces',
            'webrtcIPsFromInterfacesList',
            'webrtcAdditionalHosts',
            'webrtcICEServers2',
            'webrtcHandshakeTimeout',
            'webrtcTrackGatherTimeout',
            'webrtcSTUNGatherTimeout',
        ];

    }

    action(action, prop, value) {
        super.action(action, prop, value);

        if (this.settings.created)
            this.settings.service.saveGlobal();
    }
}
