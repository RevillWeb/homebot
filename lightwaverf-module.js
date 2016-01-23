#!/usr/bin/env node

var lightwave = require("lightwaverf");
var Q = require('q');

var LightwaveRFModule = function(config) {

    var lw = new lightwave({ip: config.lightwaverf.ip});
    var _actions = ["on", "off", "dim"];

    var service = {
        "getRoomIdByName": function (roomName) {
            var id = undefined;
            config.rooms.forEach(function (room) {
                if (id === undefined && room.name == roomName) {
                    id = room.id;
                }
            });
            return id;
        },
        "getDeviceIdByNameAndRoom": function (deviceName, roomName) {
            var deviceId = undefined;
            config.rooms.forEach(function (room) {
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
            config.rooms.forEach(function (room) {
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
            config.rooms.forEach(function (room) {
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
        }
    };

    return service;
};

module.exports = LightwaveRFModule;