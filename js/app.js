require.config({
    baseUrl: 'js',
    paths: {
        jquery: '//cdn.jsdelivr.net/jquery/2.1.1/jquery.min',
        underscore: '//cdn.jsdelivr.net/underscorejs/1.6.0/underscore-min',
        eventemitter: 'lib/eventemitter2',
        inherits: 'lib/inherits',
        eos: 'eos'
    },
    shim: {
        'underscore': {
            exports: '_'
        }
    }
});

require(
    [
        'jquery',
        'underscore',
        'eos',
        'ui'
    ],
    function ($, _, eos, ui) {

        // Binding UI
        ui.logWindow = $('#logWindow');

        // Registering events
        eos.on("log", function(payload) { console.debug(payload); });
        eos.on("debug", function(payload) { console.debug(payload); });
        eos.on("newLogEntry", function(data) {
            ui.addNewLogEntry(data.entry, data.group);
        });

        eos.connect("127.0.0.1", 8090);
    }
);