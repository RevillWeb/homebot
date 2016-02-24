#!/usr/bin/env node

var lightwave = require("lightwaverf");
var Q = require('q');

var LightwaverfModule = function(config) {

    var lw = new lightwave({ip: config.modules.lightwaverf.ip});
    var _actions = ["on", "off", "dim"];
    var _cache = {};
    var _isDuplicate = function(room, device, action, data) {
        if (_cache[room + "_" + device] !== undefined) {
            if (_cache[room + "_" + device].action === action && JSON.stringify(_cache[room + "_" + device].data) === JSON.stringify(data)) {
                return true;
            }
        }
    };
    var _cacheAction = function(room, device, action, data) {
        _cache[room + "_" + device] = {
            action: action,
            data: data
        };
    };
    var service = {
        "getRoomIdByName": function (roomName) {
            var id = undefined;
            config.modules.lightwaverf.rooms.forEach(function (room) {
                if (id === undefined && room.name == roomName) {
                    id = room.id;
                }
            });
            return id;
        },
        "getDeviceIdByNameAndRoom": function (deviceName, roomName) {
            var deviceId = undefined;
            config.modules.lightwaverf.rooms.forEach(function (room) {
                if (room.name == roomName) {
                    room.devices.forEach(function (device) {
                        if (deviceId === undefined && device.name == deviceName) {
                            deviceId = device.id;
                        }
                    });
                }
            });
            return deviceId;
        },
        "getDeviceIdsByTypeAndRoom": function (deviceType, roomName) {
            var ids = [];
            config.modules.lightwaverf.rooms.forEach(function (room) {
                if (room.name == roomName) {
                    room.devices.forEach(function (device) {
                        if (device.type == deviceType) {
                            ids.push(device.id);
                        }
                    });
                }
            });
            return ids;
        },
        "getDevicesByTypeAndRoom": function (deviceType, roomName) {
            var devices = [];
            config.modules.lightwaverf.rooms.forEach(function (room) {
                if (room.name == roomName) {
                    room.devices.forEach(function (device) {
                        if (device.type == deviceType) {
                            devices.push(device.name);
                        }
                    });
                }
            });
            return devices;
        },
        "performAction": function (room, device, action, data, delay) {
            var deferred = Q.defer();
            var roomId = service.getRoomIdByName(room);
            if (roomId !== undefined) {
                var deviceId = service.getDeviceIdByNameAndRoom(device, room);
                if (deviceId !== undefined) {
                    delay = delay || 0;
                    if (!_isDuplicate(room, device, action, data)) {
                        _cacheAction(room, device, action, data);
                        setTimeout(function () {
                            switch (action) {
                                case "on":
                                    lw.turnDeviceOn(roomId, deviceId, function (error, content) {
                                        if (error) {
                                            deferred.reject(error.message);
                                        } else {
                                            deferred.resolve(content);
                                        }
                                    });
                                    break;
                                case "off":
                                    lw.turnDeviceOff(roomId, deviceId, function (error, content) {
                                        if (error) {
                                            deferred.reject(error.message);
                                        } else {
                                            deferred.resolve(content);
                                        }
                                    });
                                    break;
                                case "dim":
                                    var brightness = parseInt(data);
                                    if (!isNaN(brightness)) {
                                        if (brightness >= 0 && brightness <= 100) {
                                            lw.setDeviceDim(roomId, deviceId, brightness, function (error, content) {
                                                if (error) {
                                                    deferred.reject(error.message);
                                                } else {
                                                    deferred.resolve(content);
                                                }
                                            });
                                        } else {
                                            deferred.reject("Invalid brightness level, 0 - 100 only.");
                                        }
                                    } else {
                                        deferred.reject("Invalid action specified.");
                                    }
                                    break;
                                default:
                                    deferred.reject("Invalid action specified.");
                            }
                        }, delay);
                    } else {
                        deferred.resolve("Already performed this last time.");
                    }
                } else {
                    deferred.reject("Device '" + device + "' in room '" + room + "' doesn't exist");
                }
            } else {
                deferred.reject("Room '" + room + "' doesn't exist");
            }
            return deferred.promise;
        },
        "performActionsForRoom": function (room, devices, action, data) {
            var promise_chain = Q.fcall(function () {});
            if (_actions.indexOf(action) > -1) {
                devices.forEach(function (device) {
                    var promise_link = function () {
                        var deferred = Q.defer();
                        service.performAction(room, device, action, data, 1000).then(function (content) {
                            deferred.resolve(content);
                        }).catch(function (error) {
                            deferred.reject(error);
                        });
                        return deferred.promise;
                    };
                    promise_chain = promise_chain.then(promise_link);
                });
            }
            return promise_chain;
        },
        "executeAction": function(data) {
            if (data.room !== undefined) {
                if (data.type !== undefined && data.action !== undefined) {
                    var devices = service.getDevicesByTypeAndRoom(data.type, data.room);
                    if (devices.length > 0) {
                        service.performActionsForRoom(data.room, devices, data.action, data.data).then(function (content) {
                            if (content == "OK") {
                                console.log("INFO (Lightwaverf) - Successfully performed '" + data.action + "' in room '" + data.room + "' for devices of type '" + data.type + "'.");
                            }
                        });
                    }
                } else if (data.device !== undefined && data.action !== undefined) {
                    service.performAction(data.room, data.device, data.action).then(function (content) {
                        if (content == "OK") {
                            console.log("INFO (Lightwaverf) - Successfully performed '" + data.action + "' action on device '" + data.device + "' in room '" + data.room + "'.");
                        }
                    }).catch(function (error) {
                        console.log("ERROR (Lightwaverf) - " + error);
                    });
                } else {
                    console.log("ERROR (Lightwaverf) - Missing data, cannot execute action.");
                }
            } else {
                console.log("ERROR (Lightwaverf) - Missing data, cannot execute action.");
            }
        }
    };

    //API
    if (config.modules.lightwaverf.api !== undefined) {

        var _token = config.modules.lightwaverf.api.token;
        var express = require('express');
        var app = express();
        var bodyParser = require('body-parser');

        app.use(bodyParser.urlencoded({extended: false}));
        app.use(bodyParser.json());

        var _success = function (res, content) {
            res.send({'success': content});
        };

        var _fail = function (res, error) {
            res.send({'error': error});
        };

        app.get('/room/:room', function (req, res) {
            var token = req.query.token;
            var room = req.params.room;
            var action = req.query.action;
            var data = req.query.data;
            var type = req.query.type;

            if (_token === undefined || token === _token) {
                var roomId = service.getRoomIdByName(room);
                if (roomId !== undefined) {
                    //Has a type been specified?
                    if (type !== undefined) {
                        var devices = service.getDevicesByTypeAndRoom(type, room);
                        if (devices.length > 0) {
                            service.performActionsForRoom(room, devices, action, data).then(function (content) {
                                _success(res, content);
                            });
                        } else {
                            _fail(res, "No devices with that type in room '" + room + "' found.")
                        }
                    } else {
                        _fail(res, "Missing parameters");
                    }
                } else {
                    _fail(res, "Invalid room specified.");
                }
            } else {
                _fail(res, "Unauthorized!");
            }
        });

        app.get('/room/:room/device/:device', function (req, res) {
            var token = req.query.token;
            var room = req.params.room;
            var action = req.query.action;
            var device = req.params.device;
            var data = req.query.data;
            if (_token === undefined || token === _token) {
                service.performAction(room, device, action, data).then(function (content) {
                    _success(res, content);
                }).catch(function (error) {
                    _fail(res, error);
                });
            } else {
                _fail(res, "Unauthorized!");
            }
        });

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
                                    service.performAction(roomId, deviceId, item.data, item.data, 1000).then(function (content) {
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
                        _success(res, content);
                    }).catch(function (error) {
                        _fail(res, error);
                    });
                }
            } else {
                _fail(res, "Unauthorized!");
            }
        });

        var port = (config.modules.lightwaverf.api.port || 8123);
        app.listen(port);
        console.log("INFO (Lightwaverf) - Started API server on port: " + port);

    }

    return service;
};

module.exports = LightwaverfModule;