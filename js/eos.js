define(['underscore', 'eventemitter', 'inherits'], function(_, emitter, inherits) {

    var EosKeySchema = /^([a-z]+):\/\/([^:]+)/i;

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
     * @param {string} data
     * @constructor
     */
    function EosLogEntry(key, data) {
        this.key  = key;
        this.data = data;
        try {
            this.object = JSON.parse(data);
        } catch (e) {
            this.object = {};
        }
    }

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
            self.emit("log", "Successfully connected to " + uri);
            self.emit("connected");
        };
        this.socket.onerror = function(){
            self.emit("log", "Connection failed");
            self.emit("connectionError");
        };
        this.socket.onclose   = this.disconnect.bind(this);
        this.socket.onmessage = this.onWebsocketMessage.bind(this);
    };

    /**
     * Disconnects from server
     */
    Eos.prototype.disconnect = function disconnect() {
        this.emit("log", "Disconnecting");
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
            this.emit("log", "Unknown schema " + key.schema);
        }
    };

    /**
     * Adds new log entry to corresponding group
     *
     * @param {EosLogEntry} entry
     */
    Eos.prototype.addLogEntry = function addLogEntry(entry) {

    };

    return new Eos();
});