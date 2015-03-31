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

        var tl = this.tags.map(function(x) {return x.trim().toLowerCase();});
        
        this.error = false;
        this.level = 'info';
        this.intLevel = 3;

        if (tl.indexOf('emergency') > -1) {
            this.error = true;
            this.intLevel = 9;
            this.level = 'emergency';
        } else if (tl.indexOf('alert') > -1) {
            this.error = true;
            this.intLevel = 8;
            this.level = 'alert';
        } else if (tl.indexOf('critical') > -1) {
            this.error = true;
            this.intLevel = 7;
            this.level = 'critical';
        } else if (tl.indexOf('error') > -1) {
            this.error = true;
            this.intLevel = 6;
            this.level = 'error';
        } else if (tl.indexOf('warning') > -1 || tl.indexOf('warn') > -1) {
            this.error = false;
            this.intLevel = 5;
            this.level = 'warning';
        } else if (tl.indexOf('notice') > -1) {
            this.intLevel = 4;
            this.level = 'notice';
        } else if (tl.indexOf('debug') > -1) {
            this.intLevel = 2;
            this.level = 'debug';
        } else if (tl.indexOf('trace') > -1) {
            this.intLevel = 1;
            this.level = 'trace';
        }

        // Variables map
        this.vars = payload || {};

        // Manual level override
        if (this.vars.level && ['trace','debug','notice','warning','warn','error','critical','alert','emergency'].indexOf(this.vars.level) !== -1) {
            this.level = this.vars.level;
        }

        // Expose markers
        this.expose = [];
        if (this.vars.expose) {
            this.expose.push(this.vars.expose);
        }

        // Building exceptions
        this.exceptions = [];
        if (this.vars.exception) {
            if (Object.prototype.toString.call(this.vars.exception) !== '[object Array]') {
                this.vars.exception = [this.vars.exception];
            }

            for (var i=0; i < this.vars.exception.length; i++) {
                var j = this.vars.exception[i];
                var e = {};

                e.code    = j.code || 0;
                e.message = j.message || null;
                e.class   = j.class || null;
                e.trace   = [];
                if (j.trace && j.trace.length > 0) {
                    for (var ti = 0; ti < j.trace.length; ti++) {
                        e.trace.push({
                            line: j.trace[ti].line | 0,
                            file: j.trace[ti].file || '-- unknown --'
                        });
                    }
                }

                this.exceptions.push(e);
            }
        }

        if (this.vars.exception) {
            console.log(this.vars.exception, this.exceptions);
        }

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
        return this.data.length;
    };

    /**
     * Applies callback to each item in list in synchronous mode
     *
     * @param {function} callback
     */
    List.prototype.eachSync = function eachSync(callback)
    {
        for (var i=0; i < this.data.length; i++) {
            callback(this.data[i])
        }
    };

    return {
        Entry: Entry,
        List: List
    };
});