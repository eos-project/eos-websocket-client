/* global define */

define("util", [], function() {
    "use strict";

    /**
     * Empty function
     *
     * @constructor
     */
    var Nop = function Nop(){};

    /**
     * Registers execution for next tick
     *
     * @param {function=} callable
     * @param {*=}        args
     */
    var nextTick = function nextTick(callable, args) {
        if (typeof callable === "function") {
            if (args) {
                setTimeout(function(){ callable.apply(callable, args); }, 0);
            } else {
                setTimeout(callable, 0);
            }
        }
    };

    var deliver = function deliver(error, data, callback) {
        if (error) {
            // Some error
            if (callback && typeof callback === "function") {
                return callback(error);
            } else {
                throw error;
            }
        } else {
            if (callback && typeof callback === "function") {
                return callback(null, data);
            } else {
                return data;
            }
        }
    };

    var console = {
        debug: Nop,
        info: Nop,
        log: Nop,
        warn: Nop,
        error: Nop
    };

    if (window && window.console) {
        console = window.console;
    }

    var dump = console.debug.bind(console);

    var inject = (function(){

        var key = "._ee_listeners";

        var emit = function emit(name, data)
        {
            if (this[key][name]) {
                for (var i=0; i < this[key][name].length; i++) {
                    nextTick(this[key][name][i], [data]);
                }
            }
        };

        var on = function on(name, callback)
        {
            if (typeof name !== "string") {
                throw "Event name must be string";
            }
            if (typeof callback !== "function") {
                throw "Callback must be string";
            }

            if (!this[key][name]) {
                this[key][name] = [];
            }

            this[key][name].push(callback);
        };

        return function inject(target)
        {
            target[key] = {};
            target.emit = emit;
            target.on   = on;
        };
    })();

    return {
        dump: dump,
        nop: Nop,
        deliver: deliver,
        nextTick: nextTick,
        console: console,
        log: console.info.bind(console),
        injectEE: inject
    };
});