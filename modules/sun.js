#!/usr/bin/env node

var SunCalc = require('suncalc');

var SunModule = function(config, EventBus) {

    var _validateCoords = function(latitude, longitude) {
        return (latitude !== undefined && !isNaN(latitude)) && (longitude !== undefined && !isNaN(longitude))
    };

    if (_validateCoords(config.modules.sun.latitude, config.modules.sun.longitude)) {
        var interval = 600000; //10 minutes
        if (config.modules.sun.interval !== undefined) {
            var ival = parseInt(config.modules.sun.interval);
            if (!isNaN(ival)) {
                interval = ival;
            }
        }
        if (config.core.automation !== undefined && config.core.automation.length > 0) {
            var _evalChange = function() {
                config.core.automation.forEach(function(condition) {
                    if (condition.module === "sun") {

                    }
                });
            };
            setInterval(function () {

            }, interval);
        }

    } else {
        console.log("ERROR (Sun) - Latitude and longitude required for sun module.");
    }

    var service = {
        "evalCondition": function(condition) {
            var itemResult = false;
            if (condition.data !== undefined) {
                if (condition.data.value !== undefined && _validateCoords(config.modules.sun.latitude, config.modules.sun.longitude)) {
                    var now = new Date();
                    var times = SunCalc.getTimes(now, config.modules.sun.latitude, config.modules.sun.longitude);
                    switch (condition.data.value) {
                        case "dark":
                            itemResult = (now >= times.sunset && now <= times.sunrise);
                            break;
                        case "light":
                            itemResult = (now <= times.sunset && now >= times.sunrise);
                            break;
                        case "sunset":
                            itemResult = (now >= times.sunsetStart && now <= times.sunset);
                            break;
                        case "sunrise":
                            itemResult = (now >= times.sunrise && now <= times.sunriseEnd);
                            break;
                    }
                } else {
                    console.log("ERROR (Sun) - Missing data, cannot evaluate condition.");
                }
            } else {
                console.log("ERROR (Sun) - Missing data, cannot evaluate condition.");
            }
            return itemResult;
        }
    };

    return service;
};

module.exports = SunModule;
