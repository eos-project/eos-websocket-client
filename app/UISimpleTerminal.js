
/* global define */

define(['jquery', 'models'], function($, Models) {

    var Terminal = function Terminal(selector, list, options)
    {
        options = options || {};

        this.$container = $(selector);
        this.grouping   = options.grouping || fllGrouper;
        this.showTime   = typeof options.showTime === 'boolean' ? options.showTime : false;
        this.autoScroll = typeof options.autoScroll === 'boolean' ? options.autoScroll : false;
        this.minLevel   = 1;
        this.list = list;

        this.groupsCount = 0;
        this.groups = {};

        // Validation
        if (this.$container.size() !== 1) {
            throw 'Unable to create container on ' + selector;
        }

        // Binding events
        list.on('new', onMessage.bind(this));
        list.on('clear', onClear.bind(this));
    };

    Terminal.prototype.repaint = function repaint()
    {
        for (var key in this.groups) {
            if (!this.groups.hasOwnProperty(key)) continue;

            this.groups[key].clear();
            this.groups[key].$ui.showTime = this.showTime;
            this.groups[key].$ui.minLevel = this.minLevel;
            this.groups[key].$ui.shown    = 0;
        }

        this.list.eachSync(onMessage.bind(this));
    };

    var onClear = function onClear() {

        if (this.groupsCount > 0) {
            for (var k in this.groups) {
                if (this.groups.hasOwnProperty(k)) {
                    this.groups[k].clear();
                    this.groups[k].$container.remove();
                }
            }
        }

        this.groupsCount = 0;
        this.groups = {};
    };

    /**
     * Callback, invoked when new message received
     *
     * @param {Entry} entry
     */
    var onMessage = function onMessage(entry)
    {
        var groupName = this.grouping(entry);
        if (!this.groups.hasOwnProperty(groupName)) {
            // Creating new group
            var group = new Models.List();

            // Attaching DOM
            group.$container = $('<section></section>').addClass('group').appendTo(this.$container);
            group.$header    = $('<div></div>').addClass('header').appendTo(group.$container);
            group.$time      = $('<span></span>').addClass('time').appendTo(group.$header);
            group.$count     = $('<span></span>').addClass('count').appendTo(group.$header);
            group.$name      = $('<span></span>').addClass('name').appendTo(group.$header);
            group.$expose    = $('<span></span>').addClass('expose').appendTo(group.$header);
            group.$countErr  = $('<span></span>').addClass('countErr').appendTo(group.$header);
            group.$content   = $('<div></div>').addClass('content').appendTo(group.$container);

            group.$ui = {
                showTime: this.showTime,
                minLevel: this.minLevel,
                expose: new Set(),
                folded: true,
                shown: 0,
                errors: 0,
                firstTime: null
            };

            // Filling defaults
            group.$name.text(groupName);

            // Attach DOM events
            group.$name.click(function() {
                if (group.$ui.folded) {
                    group.eachSync(function(e) {
                        if (e.intLevel < group.$ui.minLevel) return;
                        appendEntry(group, e);
                    });
                    group.$ui.folded = false;
                    group.$content.css('display', 'block');
                } else {
                    group.$content.empty();
                    group.$ui.folded = true;
                    group.$content.css('display', 'none');
                }
            });

            // Attaching events
            group.on('clear', function() { group.$content.empty(); });
            group.on('new', function(entry) { onMessageInsideGroup.apply(group, [entry]); });

            // Registering new group
            this.groupsCount++;
            this.groups[groupName] = group;

            document.title = '[' + this.groupsCount + '] Eos';

            if (this.autoScroll) {
                $("html, body").animate({scrollTop: $(document).height()}, 1000);
            }
        }

        this.groups[groupName].push(entry);
    };

    /**
     * Callback, invoked when new message received inside group
     *
     * @param {Entry} entry
     */
    var onMessageInsideGroup = function onMessageInsideGroup(entry)
    {
        if (this.$ui.firstTime === null) {
            this.$ui.firstTime = entry.client.time;
        }

        var deltaMs = entry.client.time.getTime() - this.$ui.firstTime.getTime();

        this.$time.html(lpad((deltaMs / 1000).toFixed(2) + 's', 6, '&nbsp;'));
        if (entry.intLevel >= this.$ui.minLevel) this.$ui.shown++;
        if (entry.error) this.$ui.errors++;

        // Adding expose
        if (entry.expose.length > 0) {
            for (var i=0; i < entry.expose.length; i++) {
                this.$ui.expose.add(entry.expose[i]);
            }
            var buffer = [];
            this.$ui.expose.forEach(function(x) {buffer.push(x)});
            this.$expose.text(buffer.join(', '));
        }

        if (this.$ui.shown === this.size()) {
            this.$count.html(lpad(this.size(), 5, '&nbsp;'));
        } else {
            this.$count.html(lpad(this.$ui.shown + '/' + this.size(), 7, '&nbsp;'));
        }
        if (this.$ui.errors > 0) {
            this.$countErr.text(this.$ui.errors === 1 ? 'error' : this.$ui.errors + ' errors');
            this.$countErr.css('display', 'inline-block');
        }
        if (!this.$ui.folded) {
            if (entry.intLevel < this.$ui.minLevel) return;
            appendEntry(this, entry);
        }
    };

    /**
     * Appends entry to DOM
     *
     * @param {object} group
     * @param {Entry}  entry
     */
    var appendEntry = function appendEntry(group, entry)
    {
        var li;
        var $dom = $('<div></div>').addClass(entry.level).appendTo(group.$content);

        if (group.$ui.showTime) {
            $('<span></span>').addClass('time').text( entry.client.time.toISOString().substring(11,23)).appendTo($dom);
        }

        if (typeof entry.vars.time === 'number') {
            $('<span></span>').addClass('delta').text((entry.vars.time * 1000.).toFixed(1) + 'ms').appendTo($dom);
        }

        if (typeof entry.vars.sql === 'string') {
            $('<span></span>').addClass('automarker').text('SQL').appendTo($dom);
        }
        if (entry.tags.indexOf('curl') !== -1 || entry.tags.indexOf('http') !== -1) {
            $('<span></span>').addClass('automarker').text('HTTP').appendTo($dom);
            if (typeof entry.vars.packetSize === 'number') {
                $('<span></span>').addClass('size').text(entry.vars.packetSize + ' bytes').appendTo($dom);
            }
        }

        $('<span></span>').addClass('message')
            .click(function() {$(this).parent().find('.details, .exception').toggle();})
            .html(spanInterpolation(entry.message, entry.vars))
            .appendTo($dom);

        var details = $('<ul></ul>').addClass('details').appendTo($dom);
        for (var key in entry.vars) {
            if (!entry.vars.hasOwnProperty(key)) continue;

            li = $('<li></li>').appendTo(details);
            $('<span></span>').addClass('name').text(key).appendTo(li);
            $('<span></span>').addClass('value').text(entry.vars[key]).appendTo(li);
        }

        if (entry.exceptions.length > 0) {
            for (var i=0; i < entry.exceptions.length; i++) {
                var j = entry.exceptions[i];
                var $exception = $('<div></div>').addClass('exception').appendTo($dom);
                var $eMeta = $('<ul></ul>').addClass('meta').appendTo($exception);
                li;

                if (j.class) {
                    li = $('<li></li>').appendTo($eMeta);
                    $('<span></span>').addClass('name').text('Exception class').appendTo(li);
                    $('<span></span>').addClass('value').text(j.class).appendTo(li);
                }
                if (j.code) {
                    li = $('<li></li>').appendTo($eMeta);
                    $('<span></span>').addClass('name').text('Exception code').appendTo(li);
                    $('<span></span>').addClass('value').text(j.code).appendTo(li);
                }
                if (j.message) {
                    li = $('<li></li>').appendTo($eMeta);
                    $('<span></span>').addClass('name').text('Message').appendTo(li);
                    $('<span></span>').addClass('value').text(j.message).appendTo(li);
                }

                var $trace = $('<ul></ul>').addClass('trace').appendTo($exception);
                for (var ti=0; ti < j.trace.length; ti++) {
                    li = $('<li></li>').appendTo($trace);
                    $('<span></span>').addClass('line').html(lpad(j.trace[ti].line, 5, '&nbsp;') + '&nbsp;').appendTo(li);
                    $('<span></span>').addClass('file').text(j.trace[ti].file).appendTo(li);
                }
            }
        }
    };

    var lpad = function lpad(str, length, char)
    {
        str = str + '';
        char = char || ' ';
        if (str.length >= length) return str;

        return (new Array(length - str.length + 1).join(char)) + str;
    };

    /**
     * Replaces placeholders in string to corresponding values from map
     *
     * @param {string} str
     * @param {object} map
     * @returns {string}
     */
    var spanInterpolation = function spanInterpolation(str, map)
    {
        str = str.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        if (typeof map !== 'object') return str;

        return str.replace(/[ ,\.]:([0-9a-z\.\-_]+)/ig, function(a, g){
            if (!map.hasOwnProperty(g)) {
                return ' <span class="missing">' + a + '</span>';
            }

            if (typeof map[g] === 'number') {
                return ' <span class="number">' + map[g] + '</span>';
            }
            if (typeof map[g] === 'boolean') {
                return ' <span class="boolean">' + ( map[g] ? 'true' : 'false' ) + '</span>';
            }

            return ' <span class="string">' + map[g] + '</span>';
        });
    };

    /**
     * Returns group name based on eos-id
     *
     * @param {Entry} entry
     * @returns {string}
     */
    var eosIdGrouper = function eosIdGrouper(entry)
    {
        var name = entry && entry.vars && typeof entry.vars['eos-id'] === 'string' ? entry.vars['eos-id'] : '<undefined>';
        if (name === 'EosClient') {
            return name;
        }
        if (!eosIdGrouper.map.hasOwnProperty(name)) {
            eosIdGrouper.map[name] = 'EOS Session ' + eosIdGrouper.last++ ;
        }

        return eosIdGrouper.map[name];
    };
    eosIdGrouper.last = 1;
    eosIdGrouper.map  = {};


    /**
     * Returns group name for frontend events
     *
     * @param {Entry} entry
     * @returns {string}
     */
    var fllGrouper = function fflGrouper(entry)
    {
        if (!entry.vars.fflId) return eosIdGrouper(entry);

        return 'Frontend @ ' + entry.vars.ip + ' ' + entry.vars.fflId
    };

    return Terminal;

});