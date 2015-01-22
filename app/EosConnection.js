
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
    };

    U.injectEE(EosConnection.prototype);

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
        U.log(this.name + " connecting to " + uri);

        this.socket.onopen  = function onopen() {
            U.log(self.name + " successfully connected");
            U.deliver(null, true, callback);
        };
        this.socket.onerror = function onerror() {
            self.wait   = false;
            self.socket = null;
            U.log(self.name + " caught an error", arguments);
            U.deliver("Connection error", null, callback);
        };
        this.socket.onclose = function onclose() {
            self.wait   = false;
            self.socket = null;
            this.emit("disconnected");
            U.log(self.name + " closed connection", arguments);
        };
        this.socket.onmessage = this.onMessage.bind(this);
    };

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
        this.emit("disconnected");
        U.log(this.name + " closed connection manually");
    };

    EosConnection.prototype.onMessage = function onMessage(packet)
    {
        var chunks = packet.data.split("\n");
        switch (chunks[0]) {
            case "uuid":
                return this.onPacketUuid(chunks.slice(1));
            case "log":
                return this.onPacketLog(chunks.slice(1));
            case "error":
                U.console.warn("Received error in " + this.name, packet);
                this.wait = false;
                this.close();
                return null;
            case "connected":
                this.wait = false;
                U.console.info("Handshake success, ready for work");
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
        U.log("Auth UUID is " + this.uuid + " starting handshake");
        U.log("Handshake is ", shake);
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
        this.emit("message", EntryFactory.websocket1(packet));
    };

    return EosConnection;
});