/* global define,Set */

define("models", ["util"], function(U) {
    "use strict";

    var Increment = 1;


    /**
     * @param payload
     * @constructor
     */
    var Entry = function Entry(payload) {

        // Frontend client data
        this.client = {
            id: Increment++,
            time: new Date()
        };

        this.message = payload.message;

        // Tag list
        this.tags = (payload.tags && payload.tags.length > 0) ? payload.tags : [];

        // Variables map
        this.vars = payload || {};

        // Capabilities list
        this.features = {};
    };

    /**
     * List of entries
     *
     * @param {function=} filter
     * @constructor
     */
    var List = function List(filter)
    {
        this.data = [];
        this.tags = new Set();
        this.filter = typeof filter === "function" ? filter : function(){ return true; };
    };

    U.injectEE(List.prototype);

    /**
     * Adds new entry
     * @param {Entry} entry
     */
    List.prototype.push = function push(entry)
    {
        if (!(entry instanceof Entry)) {
            throw "Function argument is supposed to be {Entry}";
        }
        if (!this.filter(entry)) {
            return;
        }

        this.data.push(entry);
        for (var i=0; i < entry.tags.length; i++) {
            this.tags.add(entry.tags[i]);
        }
        this.emit("new", entry);
    };

    /**
     * Alias for push
     */
    List.prototype.add = List.prototype.push;

    /**
     * Returns all entries
     *
     * @return {Entry[]}
     */
    List.prototype.all = function all()
    {
        return this.data;
    };

    /**
     * Clears list
     */
    List.prototype.clear = function clear()
    {
        this.data = [];
        this.emit("clear", this);
    };

    /**
     * Returns size of list
     *
     * @return {number}
     */
    List.prototype.size = function size()
    {
        return this.data.size();
    };

    return {
        Entry: Entry,
        List: List
    };
});