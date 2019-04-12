const Homey = require('homey');
const WebSocket = require('ws');

const seq = () => String(Date.now());
const nonce = 'nonce';

module.exports = class sonoffLanDevice extends Homey.Device {


    // this method is called when the Device is inited
    onInit() {
        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
        this.pingTimeout = 3600000; // ping every hour
        this.reconnectTimeout = 5000;
        this.pongCheckDelay = 500;
        this.connect();
        setTimeout(this.ping, this.pingTimeout, this); // ping once an hour to check if the device is still there and we have an active connection.
    }

    connect() {
        const settings = this.getSettings();
        console.log('connecting to '+settings.ip);
        try {
            this.ws = new WebSocket('ws://' + settings.ip + ':8081', ['chat']);
        } catch (err) {
            console.log(err);
            this.connect();
        }

        this.ws.on('message', (json) => {
            let messageData = {};
            if (json) {
                try {
                    messageData = JSON.parse(json);
                } catch (err) {
                    messageData = {};
                    console.log(err);
                }
            }

            if (messageData.action && messageData.params && messageData.params.switch) {
                console.log("the device state was changed, but not by Homey, updating state");
                this.setCapabilityValue('onoff', (messageData.params.switch === 'on'));
                if (this.requiredState) {
                    if (messageData.params.switch !== this.requiredState) {
                        console.log('reconnected and found that the state was to be changed, trying to change the state again');
                        this.updateState(this.requiredState);
                        this.setCapabilityValue('onoff', this.requiredState);
                    } else {
                        console.log('required state found that matches current state, not doing anything  and clearing the required state');
                        this.requiredState = undefined;
                    }
                }
            } else if (messageData.error && messageData.error !== 0) {
                console.log("something went wrong with " + this.action, messageData);
                this.action = undefined;
            } else if (messageData.error === 0) {
                if (this.action === 'update') {
                    this.requiredState = undefined;
                }
                this.action = undefined;
            }
        });

        this.ws.on('pong', () => {
            this.pongExpected = false;
        });

        this.ws.on('close', () => {
            // reconnect after 1 second.
            console.log('websocket closed, reconnecting in '+(this.reconnectTimeout/1000)+' seconds.');
            setTimeout(this.reconnect, this.reconnectTimeout, this);
        });

        this.ws.on('open', () => {
            this.sendInitiation();
        });

        this.ws.on('error', () => console.log('errored'));
    }

    reconnect(self) {
        if (self.ws.readyState !== self.ws.OPEN && self.ws.readyState !== self.ws.CONNECTING && !self.reconnecting) {
            self.reconnecting = true;
            self.ws.removeAllListeners();

            const settings = self.getSettings();
            console.log('reconnecting to ' + settings.ip);

            self.connect();
            setTimeout(self.reconnect, self.reconnectTimeout, self);
        } else {
            self.reconnecting = false;
            setTimeout(self.ping, self.pingTimeout, self); // ping once an hour to check if the device is still there and we have an active connection.
        }
    }

    sendInitiation() {
        try {
            const initiateSessionMessageJSON = JSON.stringify({
                "action": "userOnline",
                "ts": String(0 | Date.now / 1000),
                "version": 6,
                "apikey": nonce,
                "sequence": seq(),
                "userAgent": "app"
            });

            console.log('Sending User Online Message');
            this.action = 'online';
            this.ws.send(initiateSessionMessageJSON);
        } catch (err) {
            console.log(err);
            setTimeout(this.sendInitiation, 1000);
        }
    }

    updateState(newState, self) {
        if(this.constructor.name === 'sonoffLanDevice') {
            self = this;
        }
        try {
            self.requiredState = newState;
            this.action = 'update';
            console.log('updating state from ' + (self.getState() ? 'on' : 'off') + ' to ' + newState);
            const updateMessageJSON = JSON.stringify({
                "action": "update",
                "deviceid": nonce,
                "apikey": nonce,
                "selfApikey": nonce,
                "params": {
                    "switch": newState
                },
                "sequence": seq(),
                "userAgent": "app"
            });
            if (self.ws.readyState !== 1) {
                console.log("trying to update state, but websocket not open, closing and reopening, then try sending this update again.");
                self.reconnect(self);
            } else {
                console.log('Sending Update Message: switch ' + newState);
                self.ws.send(updateMessageJSON);

                function checkRequiredState() {
                    if (self.requiredState) {
                        console.log('required state found, so no response received that cleared this value');
                        self.reconnect(self);
                    }
                }

                setTimeout(checkRequiredState, 2500);
            }
        } catch (err) {
            console.log(err);
            setTimeout(self.updateState, 1000, newState, self);
        }
    }

    // this method is called when the Device has requested a state change (turned on or off)
    async onCapabilityOnoff(value) {
        this.updateState(value ? 'on' : 'off');
    }

    ping(self) {
        try {
            self.pongExpected = true;
            if (self.ws && [self.ws.CONNECTING, self.ws.OPEN].indexOf(self.ws.readyState) !== -1) {
                if (self.ws.readyState === self.ws.OPEN) {
                    self.ws.ping('ping');
                    setTimeout(self.pongReceived, self.pongCheckDelay, self);
                } else {
                    setTimeout(self.ping, self.pingTimeout, self); // ping again in one hour
                }
            } else {
                self.reconnect(self);
            }
        } catch (e) {
            console.log(e);
        }
    }

    pongReceived(self) {
        if (self) {
            if (self.pongExpected === true) {
                self.ws.close();
            } else {
                setTimeout(self.ping, self.pingTimeout, self);
            }
        } else {
            console.error('no self received, could not check pong');
        }
    }
};
