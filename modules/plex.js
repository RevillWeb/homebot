#!/usr/bin/env node

var http = require('http');
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;

var PlexModule = function(config, EventBus) {

    var _state = {};

    var _process = function(serverIp, serverPort) {
        var options = {
            host: serverIp,
            port: serverPort,
            path: '/status/sessions'
        };
        var req = http.request(options, function (res) {
            res.setEncoding('utf8');
            var xml = "";
            res.on('data', function(chunk) {
                xml += chunk;
            });
            res.on('end', function(){
                var doc = new dom().parseFromString(xml);
                var players = xpath.select("//Player", doc);
                if (players.length > 0) {
                    var exists = {};
                    var change = false;
                    players.forEach(function(player) {
                        var address = player.getAttribute("address");
                        var state = player.getAttribute("state");
                        if (address !== null) {
                            exists[address] = true;
                            if (_state[address] !== state) {
                                change = true;
                                console.log("INFO (Plex) - Player at '" + address + "' has just changed to '" + state + "'.");
                            }
                            _state[address] = state;
                        }
                    });
                    //Now lets see if any players have dropped off
                    //for (var key in _state) {
                    //    if (exists[key] === undefined) {
                    //        //Player disappeared
                    //        console.log("INFO (Plex) - Player at '" + key + "' has just disappeared.");
                    //        change = true;
                    //    }
                    //}
                    if (change === true) {
                        EventBus.emit("plex-update");
                    }
                }
            });
        });
        req.on('error', function(error) {
            console.log("ERROR (Plex) - " + error.message);
        });
        req.end();
    };

    if (config.modules.plex !== undefined && config.modules.plex.ip !== undefined) {
        var interval = 1000;
        if (config.modules.plex.interval !== undefined) {
            var ival = parseInt(config.modules.plex.interval);
            if (!isNaN(ival)) {
                interval = ival;
            }
        }
        var port = (config.modules.plex.port || 32400);
        //_process(config.modules.plex.ip, port);
        setInterval(function(){
            _process(config.modules.plex.ip, port);
        }, interval);
    }

    var service = {
        "evalCondition": function(condition) {
            var itemResult = false;
            if (condition.data.player !== undefined && condition.data.value !== undefined) {
                itemResult = (_state[condition.data.player] !== undefined && _state[condition.data.player] == condition.data.value);
            } else {
                console.log("ERROR (Plex) - Missing data, cannot evaluate condition.");
            }
            return itemResult;
        }
    };

    return service;
};

module.exports = PlexModule;
