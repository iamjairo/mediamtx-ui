import Setting from "./Setting.js";

export default class AuthSettings extends Setting {
    constructor(settings) {
        super(settings);

        this.debug = false;
        this.storeKey = 'auth';
        this.fields = [
            'authMethod',
            'authHTTPAddress',
            'authHTTPExclude',
            'authJWTJWKS',
            'authJWTJWKSFingerprint',
            'authJWTClaimKey',
            'authJWTExclude',
            'authJWTInHTTPQuery'
        ];

        this.options = {
            authMethod: ['internal', 'http', 'jwt']
        }

    }

    action(action, prop, value) {
        super.action(action, prop, value);

        if (this.settings.created)
            this.settings.service.saveGlobal();
    }
}
