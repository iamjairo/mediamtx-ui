import Go2RTCApiProxy from './Go2RTCApiProxy.js';

export default class Go2RTC {
    constructor(app) {
        this.app = app;

        this.apiUrlBase = this.app.go2rtcApiUrlBase;

        this.proxy = new Go2RTCApiProxy(this, {
            targetBaseUrl: this.apiUrlBase,
            apiUser: this.app.go2rtcApiUser,
            apiPassword: this.app.go2rtcApiPassword,
            beforeProxy: (req, res) => true,
        });
    }
}
