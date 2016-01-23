#!/usr/bin/env node

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var Q = require('q');

var success = function(res, content) {
    res.send({'success': content});
};

var fail = function(res, error) {
    res.send({'error': error});
};

var HomeBotAPI = function(config, port, modules) {

    //Configure the server
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());

    var _token = config.api.token;

    if (modules["lightwaverf"] !== undefined) {

        var lw = modules["lightwaverf"];

        app.get('/room/:room', function (req, res) {
            var token = req.query.token;
            var room = req.params.room;
            var action = req.query.action;
            var data = req.query.data;
            var type = req.query.type;

            if (_token === undefined || token === _token) {
                var roomId = lw.getRoomIdByName(room);
                if (roomId !== undefined) {
                    //Has a type been specified?
                    if (type !== undefined) {
                        var devices = lw.getDevicesByTypeAndRoom(type, room);
                        if (devices.length > 0) {
                            lw.performActionsForRoom(room, devices, action, data).then(function (content) {
                                success(res, content);
                            });
                        } else {
                            fail(res, "No devices with that type in room '" + room + "' found.")
                        }
                    } else {
                        fail(res, "Missing parameters");
                    }
                } else {
                    fail(res, "Invalid room specified.");
                }
            } else {
                fail(res, "Unauthorized!");
            }
        });

        app.get('/room/:room/device/:device', function (req, res) {
            var token = req.query.token;
            var room = req.params.room;
            var action = req.query.action;
            var device = req.params.device;
            var data = req.query.data;
            if (_token === undefined || token === _token) {
                lw.performAction(room, device, action, data).then(function (content) {
                    success(res, content);
                }).catch(function (error) {
                    fail(res, error);
                });
            } else {
                fail(res, "Unauthorized!");
            }
        });

        var aSequence = [
            {
                "room": "living",
                "device": "Light 1",
                "action": "on"
            },
            {
                "room": "living",
                "device": "Light 2",
                "action": "dim",
                "data": 10
            }
        ];

        app.post('/sequence', function (req, res) {
            var token = req.query.token;
            var sequence = req.body;
            if (_token === undefined || token === _token) {
                var promise_chain = Q.fcall(function () {
                });
                if (sequence.length > 0) {
                    sequence.forEach(function (item) {
                        var promise_link = function () {
                            var deferred = Q.defer();
                            var roomId = lw.getRoomIdByName(item.room);
                            if (roomId === undefined) {
                                deferred.reject("Room '" + item.room + "' doesn't exist.");
                            } else {
                                var deviceId = lw.getDeviceIdByNameAndRoom(item.device, item.room);
                                if (deviceId === undefined) {
                                    deferred.reject("Room '" + item.room + "' doesn't exist.");
                                } else {
                                    lw.performAction(roomId, deviceId, item.data, item.data, 1000).then(function (content) {
                                        deferred.resolve(content);
                                    }).catch(function (error) {
                                        deferred.reject(error);
                                    });
                                }
                            }
                            return deferred.promise;
                        };
                        promise_chain = promise_chain.then(promise_link);
                    });
                    promise_chain.then(function (content) {
                        success(res, content);
                    }).catch(function (error) {
                        fail(res, error);
                    });
                }
            } else {
                fail(res, "Unauthorized!");
            }
        });

    }

    app.listen(port);
    console.log("Started API server on port: " + port);
};

module.exports = HomeBotAPI;




