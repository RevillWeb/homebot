#!/usr/bin/env node

var sys = require('sys');
var exec = require('child_process').exec;
var fs = require('fs');

var HomeBotAPI = require('./homebot-api.js');

//Modules
var PresenceModule = require('./presence-module.js');
var AutomationModule = require('./automation-module.js');
var LightwaveRFModule = require('./lightwaverf-module.js');

//Get command line arguments
var args = process.argv.slice(2);
var configPath = null;
args.forEach(function(arg) {
    var parts = arg.split("=");
    if (parts[1] !== undefined) {
        switch (parts[0]) {
            case "--config":
                configPath = parts[1];
        }
    }
});

if (configPath !== null) {
    try {
        var config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
        console.log("ERROR - Could not parse config file.");
        process.exit(1);
    }
    if (config !== undefined) {

        var modules = {};

        if (config.lightwaverf !== undefined && config.lightwaverf.ip !== undefined) {
            modules["lightwaverf"] = new LightwaveRFModule(config);
        }

        if (config.people !== undefined && config.people.length > 0) {
            modules["presence"] = new PresenceModule(config, AutomationModule.EventBus);
        }

        if (config.automation !== undefined) {
            modules["automation"] = new AutomationModule.instance(config, modules);
        }


        if (config.api !== undefined) {
            var port = config.api.port || 8124;
            var apiServer = new HomeBotAPI(config, port, modules);
        }

        //Automation.EventBus.on("PresenceChange", function() {
        //    console.log(config.people);
        //});

    }
} else {
    console.log("ERROR - No config file specified");
    process.exit(1);
}






