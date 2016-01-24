#!/usr/bin/env node

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var Q = require('q');

var _success = function(res, content) {
    res.send({'success': content});
};

var _fail = function(res, error) {
    res.send({'error': error});
};

var HomeBotAPI = function(config) {

    //Configure the server
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());

    var _token = config.core.api.token;

    var port = config.core.api.port || 8124;
    app.listen(port);
    console.log("INFO (HomeBotAPI) - Started HomeBot API server on port: " + port);
};

module.exports = HomeBotAPI;




