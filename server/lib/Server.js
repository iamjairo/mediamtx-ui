import express from "express";
import session from "express-session";
import csrf from "csurf";
import fs from "fs";
import path from "path";

import Events from './EventEmitter.js';
import Routes from "./Routes/index.js";
import AuthRoutes from "./Routes/Auth.js";

export default class Server extends Events {
    constructor(app) {
        super();

        this.app = app;
        this.mediamtx = this.app.mediamtx;
        this.go2rtc = this.app.go2rtc;
        this.publicDir = this.app.publicDir;
        this.dataDir = this.app.dataDir;

        // Prefer the built React client (client/dist) when it exists; fall back
        // to the legacy vanilla server/public/ tree. CLIENT_DIST overrides.
        const clientDist = process.env.CLIENT_DIST
            || path.join(process.cwd(), '..', 'client', 'dist');
        this.clientDist = fs.existsSync(path.join(clientDist, 'index.html')) ? clientDist : null;
        this.staticDir = this.clientDist || this.publicDir;
        console.log(`SERVING STATIC FROM `.padEnd(30, '.'), this.staticDir);

        this.port = process.env.SERVER_PORT || 3000;

        this.engine = express();
        this.engine.use(express.json());

        this.engine.use(express.static(this.staticDir));

        // SPA fallback for the React client — runs BEFORE auth so the shell
        // (incl. login screen) loads when unauthenticated. Deep links like
        // /dashboard, /streamviewer that don't match a static file get
        // index.html so BrowserRouter can take over.
        if (this.clientDist) {
            const indexHtml = fs.readFileSync(path.join(this.clientDist, 'index.html'));
            const apiPrefixes = ['/mediamtx', '/go2rtc', '/api', '/auth',
                '/login', '/logout', '/csrf-token', '/settings', '/images', '/help'];
            this.engine.use((req, res, next) => {
                if (req.method !== 'GET') return next();
                if (apiPrefixes.some((p) => req.path === p || req.path.startsWith(p + '/'))) return next();
                if (path.extname(req.path)) return next();
                res.type('html').send(indexHtml);
            });
        }

        this.csrfProtection = csrf();

        this.engine.set("trust proxy", 1);

        // session cookie
        this.engine.use(session({
            name: "sid",
            secret: process.env.SESSION_SECRET || 'hossadiewaldfee',
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/"
            }
        }));

        // authentication
        this.authRoutes = new AuthRoutes(this);
        this.engine.use('/auth', this.authRoutes.router);

        // require authentication for all other routes
        this.engine.use((req, res, next) => {
            if (!req.session?.isAuthenticated) {
                return res.sendStatus(401);
            }
            next();
        });

        // Mediamtx API Proxy
        this.engine.use('/mediamtx', this.mediamtx.proxy.router);
        this.engine.use('/mediamtx/metrics', this.mediamtx.metrics.router);

        // Go2RTC API Proxy
        this.engine.use('/go2rtc', this.go2rtc.proxy.router);

        // API routes
        this.routes = new Routes(this);
        this.engine.use('/api', this.routes.router);

        // csrf error handling
        this.engine.use((err, req, res, next) => {
            if (err.code === 'EBADCSRFTOKEN') {
                return res.status(403).json({
                    error: "Invalid CSRF token",
                    message: "reload page or refresh token."
                });
            }
            next(err);
        });
    }

    async run() {
        await this.engine.listen(this.port, () => {
            console.log(`SERVER IS RUNNING ON PORT `.padEnd(30, '.'), this.port);
        });
    }
}
