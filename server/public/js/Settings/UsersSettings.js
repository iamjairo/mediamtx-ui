import Setting from "./Setting.js";

export default class UsersSettings extends Setting {
    constructor(settings) {
        super(settings, []); // <--- there is an array. if not set, it's an object

        this.storeKey = 'users';

        this.itemSchema = {
            fields: ['user', 'pass', 'ips', 'permissions'],
            options: {},
            inputType: {},
            locked: []
        };

    }

    action(action, prop, value) {
        super.action(action, prop, value);

        if (this.settings.created)
            this.settings.service.saveGlobal();
    }
}
