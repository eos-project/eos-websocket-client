define(['underscore', 'eventemitter', 'inherits'], function(_, emitter, inherits) {

    var EosKeySchema = /^([a-z]+):\/\/([^:]+)/i;
    var EosDefaultId = '--default--';
    var EosLoggingKey = new EosKey("log://eos");

    /**
     * EosKey object
     *
     * @param source
     * @constructor
     */
    function EosKey(source) {
        if (!_.isString(source)) {
            throw "Not valid key source provided";
        }

        this.src = source;

        var m = EosKeySchema.exec(source);
        if (!m) {
            throw "Cannot parse schema";
        }
        this.schema = m[1];
        this.key    = m[2];
        this.tags   = source.replace(EosKeySchema, "").trim().split(":").filter(function(x){ return x !== ""; });
    }



    /**
     * Eos log entry constructor
     *
     * @param {EosKey} key
     * @param {string|object} data
     * @constructor
     */
    function EosLogEntry(key, data) {
        this.key     = key;
        this.data    = data;
        this.message = data;
        this.index   = 1;
        if (_.isString(data)) {
            try {
                this.object = JSON.parse(data);
            } catch (e) {
                this.object = {};
            }
        } else {
            this.object = data;
        }
        this.message = (!this.object.message) ? this.data : this.object.message;
        this._id = this.object["eos-id"];
        this.receivedAt = new Date();
    }

    /**
     * Returns id
     *
     * @returns {string}
     */
    EosLogEntry.prototype.getId = function getId() {
        if (this._id) {
            return this._id;
        } else {
            return EosDefaultId;
        }
    };

    EosLogEntry.prototype.getShortMessage = function getShortMessage() {
        return this.message;
    };

    EosLogEntry.prototype.hasException = function hasException() {
        return this.object && this.object.exception;
    }

    /**
     *
     * @param {string} id
     * @constructor
     */
    function EosLogGroup(id) {
        this.id    = id;
        this.items = [];
        this.count = 0;
    }

    /**
     * @param {EosLogEntry} entry
     */
    EosLogGroup.prototype.add = function add(entry) {
        this.count++;
        this.items.push(entry);
    };

    /**
     * Main Eos service
     *
     * @constructor
     */
    function Eos() {
        emitter.constructor.call(this);

        this.socket    = null;
        this.connected = false;
        this.groups    = {};
    }
    inherits(Eos, emitter);

    /**
     * Connects to websocket server
     *
     * @param server
     * @param port
     */
    Eos.prototype.connect = function connect(server, port) {
        this.disconnect();

        var uri  = "ws://" + server + ":" + port;
        var self = this;
        this.emit("log", "Connecting to " + uri);
        this.socket = new WebSocket(uri);
        this.socket.onopen  = function(){
            self.connected = true;
            self.logSelf("Successfully connected to " + uri);
            self.emit("connected");
        };
        this.socket.onerror = function(){
            self.logSelf("Connection failed");
            self.emit("connectionError");
        };
        this.socket.onclose   = this.disconnect.bind(this);
        this.socket.onmessage = this.onWebsocketMessage.bind(this);
    };

    Eos.prototype.logSelf = function logSelf(msg) {
        this.emit("log", msg);
        this.addLogEntry(new EosLogEntry(EosLoggingKey, {'message': msg, 'eos-id': 'eos'}));
    }

    /**
     * Disconnects from server
     */
    Eos.prototype.disconnect = function disconnect() {
        this.logSelf("Disconnecting");
        if (this.connected) {
            this.connected = false;
            this.socket.close();
            this.socket = null;
        }
    };

    /**
     * Function, called on incoming packet
     */
    Eos.prototype.onWebsocketMessage = function onWebsocketMessage(packet) {
        this.emit("debug", "Received packet");
        this.emit("debug", packet);

        // Splitting
        var parts = packet.data.split("\n");
        var key   = new EosKey(parts.shift());
        var data  = parts.join("\n");

        if (key.schema === 'log') {
            var entry = new EosLogEntry(key, data);
            this.emit("debug", entry);
            this.addLogEntry(entry);
        } else {
            this.logSelf("Unknown schema " + key.schema);
        }
    };

    /**
     * Adds new log entry to corresponding group
     *
     * @param {EosLogEntry} entry
     */
    Eos.prototype.addLogEntry = function addLogEntry(entry) {
        var id    = entry.getId();
        var group = this.groups[id];
        if (!group) {
            group = new EosLogGroup(id);
            this.groups[id] = group;
        }

        group.add(entry);
        entry.index = group.count;
        this.emit("newLogEntry", {entry: entry, group: group});
    };

    return new Eos();
});