#!/usr/bin/env node

var moment = require('moment');

var TimeModule = function(config, EventBus) {

    var interval = 300000; //5 minutes
    if (config.modules.time.interval !== undefined) {
        var ival = parseInt(config.modules.time.interval);
        if (!isNaN(ival)) {
            interval = ival;
        }
    }
    //We are using time so lets update every 5 minutes
    //setInterval(function() {
    //    EventBus.emit("time-update");
    //}, interval);

    var service = {
        "evalCondition": function(condition) {
            var itemResult = false;
            if (condition.data !== undefined) {
                if (condition.data.between !== undefined && condition.data.between.start !== undefined && condition.data.between.end !== undefined) {
                    if (moment(condition.data.between.start, ["HH:mm", "Ha"]).isValid() && moment(condition.data.between.end, ["HH:mm", "Ha"]).isValid()) {
                        var start = moment(condition.data.between.start, ["HH:mm", "Ha"]);
                        var end = moment(condition.data.between.end, ["HH:mm", "Ha"]);
                        itemResult = moment(new Date()).isBetween(start, end);
                    } else {
                        console.log("ERROR (Time) - Invalid date(s) provided.");
                    }
                } else {
                    console.log("ERROR (Time) - Missing data, cannot evaluate condition.");
                }
            } else {
                console.log("ERROR (Time) - Missing data, cannot evaluate condition.");
            }
            return itemResult;
        }
    };

    return service;
};

module.exports = TimeModule;
