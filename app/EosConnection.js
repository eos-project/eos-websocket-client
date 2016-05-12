
/* global define */

define("EosConnection",
    ["underscore", "sha256", "models", "util", "EntryFactory"],
    function(_, sha, Models, U, EntryFactory)
{
    "use strict";

    var Increment = 0;

    var EosConnection = function EosConnection(options)
    {
        this.socket = null;
        this.wait   = false;

        Increment++;
        options = options || {};

        this.name   = options.name || "EosConnection #" + Increment;
        this.server = options.server || options.host;
        this.port   = options.port || 8090;
        this.realm  = options.realm;
        this.secret = options.secret;
        this.filter = options.filter || "";
        this.auto   = true;
        this.retries = 0;
        this.served  = 0;
    };

    U.injectEE(EosConnection.prototype);


    /**
     * Establishes connection to remote EOS server
     *
     * @param callback
     * @returns {*}
     */
    EosConnection.prototype.connect = function connect(callback)
    {
        if (this.socket !== null) {
            return U.deliver("Connection already established", null, callback);
        }
        if (this.wait) {
            return U.deliver("Waiting for connection", null, callback);
        }


        this.wait = true;
        var uri  = "ws://" + this.server + ":" + this.port;
        var self = this;
        this.socket = new WebSocket(uri);
        this.emit("log", this.name + " connecting to " + uri);

        this.socket.onopen  = function onopen() {
            self.emit("log", self.name + " successfully connected");
            U.deliver(null, true, callback);
        };
        this.socket.onerror = function onerror() {
            self.wait   = false;
            self.socket = null;
            self.emit("error", self.name + " caught an error", arguments);
            U.deliver("Connection error", null, callback);
        };
        this.socket.onclose = function onclose() {
            self.wait   = false;
            self.socket = null;
            self.emit("log", "Disconnected");
            self.emit("disconnected");
            self.emit("log", self.name + " closed connection", arguments);
            if (self.retries > 0) {
                self.emit("log", "Auto-reconnect #" + self.retries--);
                self.connect();
            }
        };
        this.socket.onmessage = this.onMessage.bind(this);
    };

    /**
     * Close EOS connection
     *
     * @returns {*}
     */
    EosConnection.prototype.close = function close()
    {
        if (this.socket === null) {
            return U.deliver("No connection found");
        }
        if (this.wait) {
            return U.deliver("Waiting for connection status changed");
        }

        this.socket.close();
        this.wait   = false;
        this.socket = null;
        this.retries = 0;
        this.emit("disconnected");
        this.emit("log", this.name + " closed connection manually");
    };

    /**
     * Callback to invoke on incoming message
     *
     * @param packet
     * @returns {*}
     */
    EosConnection.prototype.onMessage = function onMessage(packet)
    {
        var chunks = packet.data.split("\n");
        switch (chunks[0]) {
            case "uuid":
                return this.onPacketUuid(chunks.slice(1));
            case "log":
                return this.onPacketLog(chunks.slice(1));
            case "error":
                this.emit("error", "Received error in " + this.name);
                this.emit("error", JSON.stringify(chunks));
                this.wait = false;
                this.close();
                return null;
            case "connected":
                this.wait = false;
                if (this.auto) this.retries = 5;
                this.emit("log", "Handshake success, ready for work");
                this.emit("connected");
                return null;
            default:
                this.emit("error", "Unknown packet received");
                return null;
        }
    };

    /**
     * Function, invoked when UUID operation received from server
     * In common, it"s auth request
     *
     * @param packet
     */
    EosConnection.prototype.onPacketUuid = function onPacketUuid(packet) {
        this.uuid  = packet[0];
        var shake = this.getHandshakePacket();
        this.emit("log", "Auth UUID is " + this.uuid + " starting handshake");
        this.socket.send(shake.join("\n"));
    };

    /**
     * Returns array of data used on handshaking
     */
    EosConnection.prototype.getHandshakePacket = function getHandShakePacket()
    {
        var nonce   = new Date();
        var payload = this.filter;
        var hash    = sha.SHA256(nonce + payload + this.secret);

        return ["subscribe", this.realm , nonce, payload, hash];
    };

    /**
     * Function, invoked on incoming LOG entry
     *
     * @param {string[]} packet
     */
    EosConnection.prototype.onPacketLog = function onPacketLog(packet) {
        this.served++;
        if (this.served % 1000 === 0) {
            this.emit("log", "Served " + this.served + " messages");
        }
        this.emit("message", EntryFactory.websocket1(packet));
    };

    return EosConnection;
});