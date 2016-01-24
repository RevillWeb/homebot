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
                EventBus.emit('presence-update');
            }
        });
    };

    if (config.modules.presence.people !== undefined && config.modules.presence.people.length > 0) {
        var interval = 60000;
        if (config.modules.presence.interval !== undefined) {
            var ival = parseInt(config.modules.presence.interval);
            if (!isNaN(ival)) {
                interval = ival;
            }
        }
        config.modules.presence.people.forEach(function(person) {
            if (person.ip !== undefined) {
                _scan(person);
                setInterval(function() {
                    _scan(person);
                }, interval);
            }
        });
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
