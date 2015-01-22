/* global require */

require.config({
    baseUrl: "app",
    paths: {
        jquery:             "http://cdn.jsdelivr.net/jquery/2.1.1/jquery.min",
        underscore:         "http://cdn.jsdelivr.net/underscorejs/1.6.0/underscore-min",
        sha256:             "http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/sha256",
        moment:             "http://cdn.jsdelivr.net/momentjs/2.9.0/moment.min"
    },
    shim: {
        "underscore": {exports: "_"},
        "sha256": {exports: "CryptoJS"}
    }
});

require(["util", "models", 'EntryFactory', 'EosConnection'], function(U, Models, F, C) {
    "use strict";

    var globals = new Models.List();
    globals.on("new", function(entry) {
        U.console.debug(entry.message);
    });

    F.localMessage("Starting EOS application", globals);
    F.localMessage("Pre-initialization done", globals);


    U.dump(globals);
});