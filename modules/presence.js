#!/usr/bin/env node

var nmap = require('libnmap');

var PresenceModule = function(config, EventBus) {

    var _scan = function() {
        var ips = [];
        config.modules.presence.people.forEach(function(person) {
            if (person.ip !== undefined) {
                ips.push(person.ip);
            }
        });
        nmap.scan({
            range: ips
        }, function(error, report) {
            var update = false;
            if (!error) {
                config.modules.presence.people.forEach(function(person) {
                    var home = (report[person.ip].host[0].status[0].item.state == 'up');
                    if (person.home !== home) {
                        var status = (home === true) ? "home" : "away";
                        console.log("INFO (Presence) - " + person.name + " is now " + status + ".");
                        update = true;
                    }
                    person.home = home;
                });
            }
            if (update) {
                EventBus.emit('presence-update');
            }
        });
    };

    if (config.modules.presence.people !== undefined && config.modules.presence.people.length > 0) {
        var interval = 5000;//60000;
        if (config.modules.presence.interval !== undefined) {
            var ival = parseInt(config.modules.presence.interval);
            if (!isNaN(ival)) {
                interval = ival;
            }
        }
        _scan();
        setInterval(function() {
            _scan();
        }, interval);
    }

    var service = {
        "evalCondition": function(condition) {
            var itemResult = false;
            if (condition.data.person.toLowerCase() == "anyone") {
                config.modules.presence.forEach(function (person) {
                    if (itemResult === false) {
                        itemResult = (person[condition.data.property] == condition.data.value);
                    }
                });
            } else if (condition.data.person.toLowerCase() == "everyone") {
                var total = 0;
                config.modules.presence.people.forEach(function (person) {
                    if (person[condition.data.property] == condition.data.value) {
                        total++;
                    }
                });
                itemResult = (total === config.modules.presence.people.length);
            } else {
                config.modules.presence.people.forEach(function (person) {
                    if ((person.name !== undefined && condition.data.person !== undefined) && (person.name.toLowerCase() == condition.data.person.toLowerCase())) {
                        itemResult = (person[condition.data.property] == condition.data.value);
                    }
                });
            }
            return itemResult;
        }
    };

    return service;
};

module.exports = PresenceModule;
