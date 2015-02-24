
/* global define*/

define("EntryFactory", ["models", "util"], function(Models, U) {
    "use strict";

    var EntryFactory = {};
    var EosKeySchema = /^([a-z]+):\/\/(.+)/i;

    EntryFactory.localTag = "EosClient";

    /**
     * Creates and returns message
     *
     * @param {string} text
     * @param {List=}  target
     * @return {Entry}
     */
    EntryFactory.localMessage = function localMessage(text, target)
    {
        var e = new Models.Entry({
            message: text,
            'eos-id': EntryFactory.localTag
        });


        if (target && (target instanceof Models.List)) {
            target.push(e);
        }

        return e;
    };

    /**
     * Creates and returns message
     *
     * @param {string} text
     * @param {List=}  target
     * @return {Entry}
     */
    EntryFactory.localError = function localError(text, target)
    {
        var e = new Models.Entry({
            message: text,
            tags: ['error'],
            'eos-id': EntryFactory.localTag
        });


        if (target && (target instanceof Models.List)) {
            target.push(e);
        }

        return e;
    };

    EntryFactory.websocket1 = function websocket1(packet)
    {
        var key = packet[0], value = packet[1];

        if (typeof key !== "string") {
            throw "Wrong packet type - first line must be string";
        }

        var m = EosKeySchema.exec(key);
        if (!m) {
            throw "Cannot parse key schema";
        } else if (m[1] !== "log") {
            throw "Wrong schema";
        }

        var tags = m[2].split(":");

        try { value = JSON.parse(value); }
        catch (e) {}

        if (typeof value === "string") {
            return new Models.Entry({
                message: value,
                tags: tags
            });
        } else {
            value.tags = tags;
            return new Models.Entry(value);
        }
    };

    return EntryFactory;
});