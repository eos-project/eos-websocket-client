/* global require */

require.config({
    baseUrl: 'app',
    paths: {
        jquery:             'http://cdn.jsdelivr.net/jquery/2.1.1/jquery.min',
        underscore:         'http://cdn.jsdelivr.net/underscorejs/1.6.0/underscore-min',
        sha256:             'http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/sha256',
        moment:             'http://cdn.jsdelivr.net/momentjs/2.9.0/moment.min'
    },
    shim: {
        'underscore': {exports: '_'},
        'sha256': {exports: 'CryptoJS'}
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
    $('#minLevel').change(function(){
        ui.minLevel = $(this).val();
        ui.repaint();
    });

    F.localMessage('Starting EOS application', globals);
    F.localMessage('Pre-initialization done', globals);

    // Creating EOS connection
    var eos = new C({host: '', realm: '', secret: ''});
    eos.on("message", function(e){ console.log(e); globals.push(e) });
    eos.connect();

    // Testing
    globals.push(new Models.Entry({message: 'Test trace', tags:['trace', 'zzz', 'xxx']}));
    globals.push(new Models.Entry({message: 'Test debug', tags:['debug', 'foo', 'bar']}));
    globals.push(new Models.Entry({message: 'Test info for :name with ID :id and active :active and :more', tags:['info'], id: 15, name: 'Jessy', active: true}));
    globals.push(new Models.Entry({message: 'Test notice', tags:['notice']}));
    globals.push(new Models.Entry({message: 'Test warn', tags:['warn']}));
    globals.push(new Models.Entry({message: 'Test error', tags:['error']}));
    globals.push(new Models.Entry({message: 'Test warning', tags:['warning']}));
    globals.push(new Models.Entry({message: 'Test alert', tags:['alert']}));
    globals.push(new Models.Entry({message: 'Test emergency', tags:['emergency']}));
    globals.push(new Models.Entry({message: 'Test critical', tags:['critical']}));

    //setInterval(function(){
    //    F.localMessage('Tic tac', globals);
    //}, 1000);

    U.dump(globals);
});