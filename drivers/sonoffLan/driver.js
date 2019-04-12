const Homey = require('homey');

module.exports = class sonoffLan extends Homey.Driver {

    // This method is called when a user is adding a device
    // and the 'list_devices' view is called
    onPair(socket) {
        let ip = '';
        let name = '';

        // this method is run when Homey.emit('list_devices') is run on the front-end
        // which happens when you use the template `list_devices`
        socket.on('list_devices', function (data, callback) {
            const devices = [{
                data: {
                    id: ip,
                    ip: ip
                },
                name: name
            }];
            callback(null, devices);
        });

        // this is called when the user presses save settings button in start.html
        socket.on('get_devices', function (data, callback) {
            console.log(data);
            // Set passed pair settings in variables
            ip = data.ip;
            name = data.name;

            const devices = [{
                data: {
                    id: ip,
                    ip: ip
                },
                name: name
            }];

            if (!(data.name === undefined || data.name === null || data.name.length === 0)) {
                tempServerName = data.serverName;
            }
            Homey.log("SSH Client - got get_devices from front-end, tempHostName =", name);
            callback(null, devices);
        });
    };
};