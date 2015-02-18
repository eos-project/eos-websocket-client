
/* global define */

define(['jquery', 'models'], function($, Models) {

    var Terminal = function Terminal(selector, list, options)
    {
        options = options || {};

        this.$container = $(selector);
        this.grouping   = options.grouping || eosIdGrouper;
        this.showTime   = typeof options.showTime === 'boolean' ? options.showTime : false;
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

    // todo
    var onClear = function onClear() {};

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
            group.$countErr  = $('<span></span>').addClass('countErr').appendTo(group.$header);
            group.$name      = $('<span></span>').addClass('name').appendTo(group.$header);
            group.$content   = $('<div></div>').addClass('content').appendTo(group.$container);

            group.$ui = {
                showTime: this.showTime,
                minLevel: this.minLevel,
                folded: true,
                shown: 0,
                firstTime: new Date()
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
                } else {
                    group.$content.empty();
                    group.$ui.folded = true;
                }
            });

            // Attaching events
            group.on('clear', function() { group.$content.empty(); });
            group.on('new', function(entry) { onMessageInsideGroup.apply(group, [entry]); });

            // Registering new group
            this.groupsCount++;
            this.groups[groupName] = group;
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
        var deltaMs = entry.client.time.getTime() - this.$ui.firstTime.getTime();

        this.$time.html(lpad('Δ ' + (deltaMs / 1000).toFixed(2) + 's', 8, '&nbsp;'));
        if (entry.intLevel >= this.$ui.minLevel) this.$ui.shown++;
        if (this.$ui.shown === this.size()) {
            this.$count.html(lpad(this.size(), 3, '&nbsp;'));
        } else {
            this.$count.html(lpad(this.$ui.shown + '/' + this.size(), 5, '&nbsp;'));
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

        var $dom = $('<div></div>').addClass(entry.level).appendTo(group.$content);

        if (group.$ui.showTime) {
            $('<span></span>').addClass('time').text( entry.client.time.toISOString().substring(11,23)).appendTo($dom);
        }

        $('<span></span>').addClass('message').click(function() {$(this).parent().find('.details').toggle();}).html(spanInterpolation(entry.message, entry.vars)).appendTo($dom);
        var details = $('<ul></ul>').addClass('details').appendTo($dom);
        for (var key in entry.vars) {
            if (!entry.vars.hasOwnProperty(key)) continue;

            var li = $('<li></li>').appendTo(details);
            $('<span></span>').addClass('name').text(key).appendTo(li);
            $('<span></span>').addClass('value').text(entry.vars[key]).appendTo(li);
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
     * @param entry
     * @returns {*}
     */
    var eosIdGrouper = function eosIdGrouper(entry)
    {
        return entry && entry.vars && typeof entry.vars['eos-id'] === 'string' ? entry.vars['eos-id'] : '<undefined>';
    };

    return Terminal;

});