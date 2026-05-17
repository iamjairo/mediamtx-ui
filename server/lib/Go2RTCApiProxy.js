import MediamtxProxy from "./MediamtxProxy.js";

export default class Go2RTCApiProxy extends MediamtxProxy {
    constructor(...args) {
        super(...args);

        this.routes = [
            'GET /api',
            'GET /api/streams',
            'PUT /api/streams',
            'POST /api/streams',
            'DELETE /api/streams',
            'GET /api/streams/:name',
            'POST /api/webrtc',
            'GET /api/frame.jpeg',
            'GET /api/stream.m3u8',
            'GET /api/config',
            'PATCH /api/config',
            'GET /api/log',
            'GET /api/info',
        ];

        this.router = this.express.Router();
        this._register();
    }
}
