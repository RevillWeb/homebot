#!/usr/bin/env node

var events = require('events');
var EventBus = new events.EventEmitter();

var AutomationModule = function(config, modules) {

    var _executeAction = function(action) {
        switch (action.module) {
            case "lightwaverf":
                var lw = modules['lightwaverf'];
                if (lw !== undefined) {
                    lw.performAction(action.data.room, action.data.device, action.data.action).then(function(content) {
                        if (content == "OK") {
                            console.log("INFO (Automation) - Successfully performed '" + action.data.action + "' action on device '" + action.data.device + "' in room '" + action.data.room + "'.");
                        }
                    }).catch(function(error){
                        console.log("ERROR (Automation) - " + error);
                    });
                }
                break;
        }
    };

    var _processItem = function(item) {
        var result = null;
        if (item.conditions !== undefined && item.conditions.length > 0) {
            item.conditions.forEach(function (condition) {
                if (result === null) {
                    var conditionResult = null;
                    switch (condition.module) {
                        case "presence":
                            var itemResult = false;
                            if (condition.data.person.toLowerCase() == "anyone") {
                                config.people.forEach(function (person) {
                                    if (itemResult === false) {
                                        itemResult = (person[condition.data.property] == condition.data.value);
                                    }
                                });
                            } else if (condition.data.person.toLowerCase() == "everyone") {
                                var total = 0;
                                config.people.forEach(function (person) {
                                    if (person[condition.data.property] == condition.data.value) {
                                        total++;
                                    }
                                });
                                itemResult = (total === config.people.length);
                            } else {
                                config.people.forEach(function (person) {
                                    if ((person.name !== undefined && condition.data.person !== undefined) && (person.name.toLowerCase() == condition.data.person.toLowerCase())) {
                                        itemResult = (person[condition.data.property] == condition.data.value);
                                    }
                                });
                            }
                            conditionResult = itemResult;
                            break;
                        default:
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
    };

    if (config.automation !== undefined && config.automation.length > 0) {
        config.automation.forEach(function(item){

            //Register for appropriate events based on module
            if (item.conditions !== undefined && item.conditions.length > 0) {
                item.conditions.forEach(function(condition){
                    switch (condition.module) {
                        case "presence":
                            EventBus.on("PresenceChange", function() {
                                _processItem(item);
                            });
                            break;
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
