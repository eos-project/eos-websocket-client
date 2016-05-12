/* global require */

require.config({
    baseUrl: 'app',
    paths: {
        jquery:             'http://cdn.jsdelivr.net/jquery/2.1.1/jquery.min',
        underscore:         'http://cdn.jsdelivr.net/underscorejs/1.6.0/underscore-min',
        moment:             'http://cdn.jsdelivr.net/momentjs/2.9.0/moment.min',
        sha256:             '../js/lib/sha256.min',
    },
    shim: {
        'underscore': {exports: '_'}
    }
});

require(['util', 'models', 'EntryFactory', 'EosConnection', 'UISimpleTerminal', 'jquery'], function(U, Models, F, C, UI, $) {
    'use strict';

    var globals = new Models.List();

    var ui = new UI('#Terminal', globals);

    // Binding ui events
    $('#showTime').change(function() {
        ui.showTime = $(this).prop('checked');
        ui.repaint();
    });
    $('#autoScroll').change(function() {
        ui.autoScroll = $(this).prop('checked');
        ui.repaint();
    });
    $('#minLevel').change(function(){
        ui.minLevel = $(this).val();
        ui.repaint();
    });

    $('#fontSize').click(function(){ $('body').toggleClass('largeFont'); });
    $('#clearAll').click(function(){ var size = globals.size(); globals.clear(); F.localMessage('Cleared ' + size + ' messages', globals); });

    F.localMessage('Starting client application', globals);

    // Reading optins
    var hash = window.location.hash.substring(1).split('&');
    var opts = {};
    for (var i=0; i < hash.length; i++) {
        var j = hash[i].split('=');
        opts[j[0]] = j[1];
    }

    if (opts.large) {
        $('body').addClass('largeFont');
    }
    if (opts.level) {
        $('#minLevel').val(opts.level);
        $('#minLevel').change();
    }

    if (opts.host && opts.realm && opts.secret) {
        var eos = new C({host: opts.host, port: opts.port, realm: opts.realm, secret: opts.secret, filter: opts.filter});
        eos.on("log", function(text) {F.localMessage(text, globals)});
        eos.on("error", function(text) {F.localError(text, globals)});
        eos.on("message", function(e){ globals.push(e) });
        eos.connect();
    } else {
        F.localError(
            'Unable to read EOS connection configuration. Url must be like #host=&realm=&secret=',
            globals
        );
    }
});