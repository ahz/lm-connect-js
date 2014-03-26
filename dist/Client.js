var restify = require('restify');
var data2xml = require('data2xml');
var xml2js = require('xml2js');
var S = require('string');

var parser = new xml2js.Parser(), xml = data2xml();

function createClient(cfg) {
    return new SewebarConnectClient(cfg);
}
exports.createClient = createClient;

function errorHandler(err, info, callback) {
    var e = err && err.body ? err.body : '', error = S(e).trim().s;

    xml2js.parseString(error, function (parseError, result) {
        var message = err.statusCode || 'Uknonwn error - ' + info;

        if (parseError) {
            message = err.message || err || parseError;
        } else {
            message = result && result.response ? result.response.message[0] : message;
        }

        if (callback && typeof callback === 'function') {
            callback(message, null);
        }
    });
}

function getAnonymousUser() {
    return {
        name: 'anonymous',
        password: ''
    };
}

var SewebarConnectClient = (function () {
    function SewebarConnectClient(cfg) {
        var options = {
            host: "127.0.0.1",
            port: 8888,
            path: 'url',
            accept: 'application/xml',
            'content-type': 'application/xml',
            headers: {
                Host: 'localhost'
            }
        };

        var user = getAnonymousUser();

        this.opts = cfg;

        this.opts.contentType = 'application/xml';
        this.server = this.opts.app == null ? 'SewebarConnect' : this.opts.app;

        if (this.server.substring(0, 1) !== '/') {
            this.server = '/' + this.server;
        }

        if (this.server.slice(-1) !== '/') {
            this.server = this.server + '/';
        }

        delete this.opts.app;

        this.restClient = restify.createStringClient(this.opts);
        this.restClient.basicAuth(user.name, user.password);
    }
    SewebarConnectClient.prototype.register = function (connection, metabase, callback) {
        var _this = this;
        var mb, database, data, raw, url = [
            this.server,
            'miners'
        ].join('');

        if (connection.type.toLocaleLowerCase() == 'access') {
            database = {
                _attr: { type: connection.type },
                File: connection.file
            };
        } else {
            database = {
                _attr: { type: connection.type },
                Server: connection.server,
                Database: connection.database,
                Username: connection.username,
                Password: connection.password
            };
        }

        if (metabase) {
            if (metabase.type.toLocaleLowerCase() == 'access') {
                mb = {
                    _attr: { type: metabase.type },
                    File: metabase.file
                };
            } else if (metabase.type.toLocaleLowerCase() == 'mysql') {
                mb = {
                    _attr: { type: metabase.type },
                    Server: metabase.server,
                    Database: metabase.database,
                    Username: metabase.username,
                    Password: metabase.password
                };
            }
        }

        raw = {
            Connection: database
        };

        if (mb) {
            raw.Metabase = mb;
        }

        data = xml('RegistrationRequest', raw);

        this.opts.path = url;

        this.restClient.post(this.opts, data, function (err, req, res, body) {
            var xml = S(body).trim().s;

            parser.parseString(xml, function (parseErr, result) {
                if (!parseErr && result.response['$'].status === 'success') {
                    if (callback && typeof callback === 'function') {
                        callback(null, new Miner(result.response['$'].id, _this));
                    }
                } else {
                    errorHandler(err, 'POST ' + url, callback);
                }
            });
        });
    };

    SewebarConnectClient.prototype.getMiner = function (id, callback) {
        var _this = this;
        var url = [
            this.server,
            'miners/',
            encodeURIComponent(id)
        ].join('');

        this.restClient.get(url, function (err, req, res, body) {
            var xml = S(body).trim().s;

            parser.parseString(xml, function (err, result) {
                if (!err && result.response['$'].status === 'success') {
                    if (callback && typeof callback === 'function') {
                        callback(null, new Miner(result.response['$'].id, _this));
                    }
                } else {
                    errorHandler(err, 'POST ' + url, callback);
                }
            });
        });
    };
    return SewebarConnectClient;
})();
exports.SewebarConnectClient = SewebarConnectClient;

var Miner = (function () {
    function Miner(miner_id, client) {
        this.miner_id = miner_id;
        this.client = client;
        this.server = this.client.server;
        this.opts = this.client.opts;
    }
    Object.defineProperty(Miner.prototype, "id", {
        get: function () {
            return this.miner_id;
        },
        enumerable: true,
        configurable: true
    });

    Miner.prototype.init = function (dictionary, callback) {
        var url = [
            this.server,
            'miners/',
            encodeURIComponent(this.id),
            '/',
            'DataDictionary'
        ].join('');

        this.opts.path = url;

        this.client.restClient.put(this.opts, dictionary, function (e, req, res, data) {
            if (e) {
                errorHandler(e, 'PUT ' + url, callback);
            } else {
                if (callback && typeof callback === 'function') {
                    callback(null);
                }
            }
        });
    };

    Miner.prototype.runTask = function (task, callback) {
        var opts;

        if (typeof task === 'string') {
            opts = {
                type: 'task',
                definition: task
            };
        } else {
            opts = task || {};
        }

        var url = [
            this.server,
            'miners/',
            this.id,
            '/tasks/',
            opts.type,
            '?alias=', (opts.alias || ''),
            '&template=', (opts.template || '')
        ].join('');

        this.opts.path = url;

        this.client.restClient.post(this.opts, opts.definition, function (e, req, res, data) {
            if (e) {
                errorHandler(e, 'POST ' + url, callback);
            } else if (callback && typeof callback === 'function') {
                callback(null, data);
            }
        });
    };

    Miner.prototype.cancelTask = function (task, callback) {
        var opts, url, data = xml('CancelationRequest', {});

        if (typeof task === 'string') {
            opts = {
                type: 'task',
                name: task
            };
        } else {
            opts = task || {};
        }

        url = [
            this.server,
            'miners/',
            this.id,
            '/tasks',
            '/', opts.type, '/',
            opts.name
        ];

        this.opts.path = url.join('');

        this.client.restClient.put(this.opts, data, function (e, req, res, d) {
            if (e) {
                errorHandler(e, 'PUT ' + url, callback);
            } else if (callback && typeof callback === 'function') {
                callback(null, d);
            }
        });
    };

    Miner.prototype.cancelAll = function (type, callback) {
        this.cancelTask({
            type: type || 'task'
        }, callback);
    };

    Miner.prototype.getTask = function (task, callback) {
        var opts;

        if (typeof task === 'string') {
            opts = {
                type: 'task',
                name: task
            };
        } else {
            opts = task || {};
        }

        var url = [
            this.server,
            'miners/',
            this.id,
            '/tasks/',
            '/',
            opts.name,
            '?alias=', (opts.alias || ''),
            '&template=', (opts.template || '')
        ].join('');

        this.opts.path = url;

        this.client.restClient.get(this.opts, function (e, req, res, data) {
            if (e) {
                errorHandler(e, 'GET ' + url, callback);
            } else if (callback && typeof callback === 'function') {
                callback(null, data);
            }
        });
    };

    Miner.prototype.getAllTasks = function (callback) {
        var url = [
            this.server,
            'miners/',
            this.id,
            '/tasks'
        ].join('');

        this.opts.path = url;

        this.client.restClient.get(this.opts, function (e, req, res, data) {
            if (e) {
                errorHandler(e, 'GET ' + url, callback);
            } else if (callback && typeof callback === 'function') {
                callback(null, data);
            }
        });
    };

    Miner.prototype.remove = function (callback) {
        var url = [
            this.server,
            'miners/',
            this.id
        ].join('');

        this.opts.path = url;

        this.client.restClient.del(this.opts, function (e, req, res, data) {
            if (e) {
                errorHandler(e, 'DELETE ' + url, callback);
            } else if (callback && typeof callback === 'function') {
                callback(null);
            }
        });
    };

    Miner.prototype.getDataDictionary = function (dd, callback) {
        var opts, url;

        if (typeof dd === 'string') {
            opts = {
                matrix: dd
            };
        } else {
            opts = dd || {};
        }

        url = [
            this.server,
            'miners/',
            this.id,
            '/DataDictionary',
            '?matrix=', (opts.matrix || ''),
            '&template=', (opts.template || '')
        ].join('');

        this.opts.path = url;

        this.client.restClient.get(this.opts, function (e, req, res, data) {
            if (e) {
                errorHandler(e, 'GET ' + url, callback);
            } else if (callback && typeof callback === 'function') {
                callback(null, data);
            }
        });
    };
    return Miner;
})();
exports.Miner = Miner;
//# sourceMappingURL=Client.js.map
