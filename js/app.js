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
        'eos'
    ],
    function ($, _, eos) {
        console.log("Yahoo");
        console.log(eos);

        // Registering events
        eos.on("log", function(payload) { console.debug(payload); });
        eos.on("debug", function(payload) { console.debug(payload); });

        eos.connect("127.0.0.1", 8090);
    }
);