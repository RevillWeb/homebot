#!/usr/bin/env node

var sys = require('sys');
var exec = require('child_process').exec;
var fs = require('fs');

//Core
var automation = require('./core/automation.js');
var api = require('./core/api.js');

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

        if (config.modules !== undefined) {
            for (var key in config.modules) {
                try {
                    //modules[key] = new require("./" + key + "Module")(config);
                    var module = require("./modules/" + key + ".js");
                    modules[key] = new module(config, automation.EventBus);
                } catch (e) {
                    console.log(e.message);
                }
            }
        }

        var automationInstance = new automation.instance(config, modules);

    }
} else {
    console.log("ERROR - No config file specified");
    process.exit(1);
}






