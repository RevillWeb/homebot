#!/usr/bin/env node

var events = require('events');
var EventBus = new events.EventEmitter();
var winston = require('winston');

var AutomationModule = function(config, modules) {

    var _executeAction = function(action) {
        if (modules[action.module] !== undefined) {
            if (modules[action.module].executeAction !== undefined) {
                modules[action.module].executeAction(action.data);
            } else {
                console.log("ERROR (Automation) - Module doesn't have action capabilities.");
            }
        } else {
            console.log("ERROR (Automation) - Invalid module specified.");
        }
    };

    var _processConditions = function(conditions) {
        var result = null;
        if (conditions !== undefined && conditions.length > 0) {
            conditions.forEach(function (condition) {
                if (result === null) {
                    var conditionResult = null;
                    if (modules[condition.module] !== undefined) {
                        if (modules[condition.module].evalCondition !== undefined) {
                            conditionResult = modules[condition.module].evalCondition(condition);
                        } else {
                            console.log("ERROR (Automation) - Module doesn't have condition capabilities.");
                        }
                    } else {
                        console.log("ERROR (Automation) - Invalid module specified.");
                    }
                    if (conditionResult === false) {
                        result = false;
                    }
                }
            });
            if (result === null) {
                result = true;
            }
        }
        return result;
    };

    if (config.core.automation !== undefined && config.core.automation.length > 0) {
        var history = {};
        config.core.automation.forEach(function(item) {
            //Register for appropriate events based on module
            if (item.conditions !== undefined && item.conditions.length > 0) {
                item.conditions.forEach(function(condition) {
                    if (modules[condition.module] !== undefined) {
                        EventBus.on(condition.module + "-update", function() {
                            var result = _processConditions(item.conditions);
                            //Only execute actions when the result changes
                            if (result !== history[condition.module]) {
                                if (result === true) {
                                    if (item.true_actions !== undefined && item.true_actions.length > 0) {
                                        console.log("INFO (Automation) - Executing true actions.");
                                        item.true_actions.forEach(function (action) {
                                            _executeAction(action);
                                        });
                                    }
                                } else if (result === false) {
                                    if (item.false_actions !== undefined && item.false_actions.length > 0) {
                                        console.log("INFO (Automation) - Executing false actions.");
                                        item.false_actions.forEach(function (action) {
                                            _executeAction(action);
                                        });
                                    }
                                }
                            }
                            history[condition.module] = result;
                        });
                    }
                });
            }
        });
    }
};

module.exports = {
    "EventBus": EventBus,
    "instance": AutomationModule
};
