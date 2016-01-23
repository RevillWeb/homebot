#!/usr/bin/env node

var nmap = require('libnmap');


var PresenceModule = function(config, EventBus) {

    var _scan = function(person) {
        nmap.scan({
            range: [person.ip]
        }, function(error, report) {
            var home = false;
            if (!error) {
                home = (report[person.ip].host[0].status[0].item.state == 'up');
            }
            var change = (person.home !== home);
            person.home = home;
            if (change) {
                var status = (person.home === true) ? "home" : "away";
                console.log("INFO (Presence) - " + person.name + " is now " + status + ".");
                EventBus.emit('PresenceChange');
            }
        });
    };

    if (config.people !== undefined && config.people.length > 0) {
        config.people.forEach(function(person) {
            if (person.ip !== undefined) {
                _scan(person);
                setInterval(function() {
                    _scan(person);
                }, 60000);
            }
        });
    }
};

module.exports = PresenceModule;
