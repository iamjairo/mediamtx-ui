import express from "express";
import rateLimit from "express-rate-limit";

export default class AuthRoutes {
    constructor(server) {
        this.server = server;
        this.app = this.server.app;
        this.auth = this.app.auth;

        this.router = express.Router();
        this.csrfProtection = this.server.csrfProtection;
        this.loginRateLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 20,
            standardHeaders: true,
            legacyHeaders: false
        });

        // get CSRF token
        this.router.get("/csrf", this.csrfProtection, (req, res) => {
            res.json({csrfToken: req.csrfToken()});
        });

        // login
        this.router.post("/login", this.loginRateLimiter, this.csrfProtection, async (req, res) => {

            if (!await this.auth.login(req, res))
                return res.sendStatus(401);

            res.json({
                ok: true
            });
        });

        // logout
        this.router.post("/logout", this.csrfProtection, async (req, res) => {
            await this.auth.logout(req, res);
            res.json({ok: true});
        });

        //
        this.router.get("/status",  this.csrfProtection, (req, res) => {
            res.json({
                isAuthenticated: req.session?.isAuthenticated || false
            });
        });
    }
}