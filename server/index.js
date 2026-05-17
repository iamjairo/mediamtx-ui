import path from "path";

import Events from './lib/EventEmitter.js';
import MediaMTX from './lib/MediaMTX.js';
import Go2RTC from './lib/Go2RTC.js';
import Server from "./lib/Server.js";
import Auth from "./lib/Auth.js";

// is not used at the moment
import Streams from "./lib/Streams.js";

export default class Main extends Events {
    constructor() {
        super();
        this.__dirname = process.cwd();
        this.dataDir = path.join(this.__dirname, "../data");
        this.publicDir = path.join(this.__dirname, "public");

        this.mediamtxApiUrlBase = process.env['MEDIAMTX_API_URL_BASE'] ?? `http://mediamtx:9997/v3`;
        this.mediamtxMetricsUrlBase = process.env['MEDIAMTX_METRICS_URL_BASE'] ?? `http://mediamtx:9998/metrics`;
        this.mediamtxApiUser = process.env['MEDIAMTX_API_USER'] || false;
        this.mediamtxApiPassword = process.env['MEDIAMTX_API_PASSWORD'] || false;

        this.go2rtcApiUrlBase = process.env['GO2RTC_API_URL_BASE'] ?? `http://go2rtc:1984`;
        this.go2rtcApiUser = process.env['GO2RTC_API_USER'] || false;
        this.go2rtcApiPassword = process.env['GO2RTC_API_PASSWORD'] || false;

        process.on('SIGINT', async () => {
            console.log('Stoppe…');
            await this.cleanup();
            process.exit(0);
        });

        this.auth = new Auth(this);
        this.mediamtx = new MediaMTX(this);
        this.go2rtc = new Go2RTC(this);
        //this.streams = new Streams(this);
        this.server = new Server(this);

        /*this.streams.on('loaded', () => {
             console.log(`LOADED STREAMS `.padEnd(30, '.'), this.streams.data.length);
             console.log(`STREAMS `.padEnd(30, '.'), this.streams.data.keys());
        });*/
    }

    async run() {
        await this.server.run();
        //await this.streams.run();
    }

    async cleanup() {
        await  this.streams.cleanup();
    }

}

const CameraApp = new Main();
CameraApp.run();