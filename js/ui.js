define(['underscore', 'jquery'], function(_, $) {

    /**
     * UI object
     */
    var ui = {
        logWindow: null
    };

    /**
     * Returns or creates group
     *
     * @param {string} name Log group name
     * @returns {*}
     */
    ui.getGroup = function getGroup(name) {
        var x = ui.logWindow.find("#" + name);
        if (x.size() === 0) {
            x = ui.buildGroup(name);
        }

        return x;
    };

    /**
     * Builds and returns DOM for group
     *
     * @param name
     * @returns {*}
     */
    ui.buildGroup = function buildGroup(name) {
        var x = $("<div></div>").addClass("group").addClass("hiddenGroup");
        x.attr("id", name);

        var title = $("<div></div>").addClass("header").appendTo(x);
        $("<span></span>").addClass("toggle").click(ui.toggleGroup).text(" [...] ").appendTo(title);
        $("<span></span>").addClass("time").click(ui.toggleGroup).text("...").appendTo(title);
        $("<span></span>").addClass("title").click(ui.toggleGroup).text(name).appendTo(title);
        $("<span></span>").addClass("count").click(ui.toggleGroupDetails).appendTo(title);
        x.appendTo(ui.logWindow);

        return x;
    };

    /**
     * Builds and return DOM for log entry
     *
     * @param {EosLogEntry} entry
     * @returns {*}
     */
    ui.buildLogEntry = function buildLogEntry(entry) {
        var dom = $('<div></div>').addClass("entry");
        dom.data("entry", entry);
        $('<span></span>').addClass("index").text(entry.index + ". ").appendTo(dom);
        $('<span></span>')
            .addClass("time")
            .text(entry.receivedAt.getSeconds() + "." + entry.receivedAt.getMilliseconds())
            .click(ui.toggleEntry)
            .appendTo(dom);
        if (entry.hasException()) {
            $('<span></span>').addClass('exception').text('err').appendTo(dom);
        }
        $('<span></span>').addClass("message").text(entry.getShortMessage()).appendTo(dom);

        return dom;
    };

    /**
     * Adds log entry to group
     *
     * @param {EosLogEntry} entry
     * @param {EosLogGroup} group
     */
    ui.addNewLogEntry = function addNewLogEntry(entry, group) {
        var gDom = ui.getGroup(group.id);
        gDom.children(".header").children(".count").text(group.count);
        gDom.children(".header").children(".time").text(
            entry.receivedAt.getHours() + ":" + entry.receivedAt.getMinutes() + ":" + entry.receivedAt.getSeconds()
        );
        ui.buildLogEntry(entry).appendTo(gDom);
    };

    /**
     * Callback, that toggles visibility of group
     */
    ui.toggleGroup = function toggleGroup() {
        $(this).parent().parent().toggleClass("hiddenGroup");
    };

    /**
     * Callback, that toggles visibility of details inside group
     */
    ui.toggleGroupDetails = function toggleGroupDetails() {
        var details = $(this).parent().parent().find('.entry .details');
        if (details.size() > 0) {
            details.remove();
        } else {
            $(this).parent().parent().find('.entry .time').each(function (i,o) {$(o).click();});
        }
    };

    /**
     * Callback, that toggles visibility of details inside log entry
     */
    ui.toggleEntry = function toggleEntry() {
        var o = $(this).parent();
        var entry = o.data('entry');

        var details = o.find(".details");
        if (details.size() == 0) {
            ui.buildEntryDetails(entry).appendTo(o);
        } else {
            details.remove();
        }
    };

    /**
     * Builds and returns DOM of log entry details
     *
     * @param {EosLogEntry} entry
     * @returns {*}
     */
    ui.buildEntryDetails = function buildEntryDetails(entry) {
        var dom = $('<div></div>').addClass("details");

        $("<span class='var-name-internal'>Eos ID</span><span class='var-value'>" + entry.getId() + "</span><br />").appendTo(dom);
        $("<span class='var-name-internal'>Key</span><span class='var-value'>" + entry.key.key + "</span><br />").appendTo(dom);
        if (entry.key.tags.length > 0) {
            $("<span class='var-name-internal'>Tags</span><span class='var-value'>" + entry.key.tags.join(", ") + "</span><br />").appendTo(dom);
        }

        if (_.isObject(entry.object)) {
            // Building data details

            if (entry.object.time || entry.object.count) {
                if (entry.object.time) {
                    $("<span class='var-name'>Time</span><span class='var-value-float'>" + entry.object.time + "</span>").appendTo(dom);
                }
                if (typeof entry.object.count != 'undefined') {
                    $("<span class='var-name'>Count</span><span class='var-value-int'>" + entry.object.count + "</span>").appendTo(dom);
                }
                $("<br />").appendTo(dom);
            }
            if (entry.object.sql) {
                $("<span class='var-name'>SQL</span><span class='var-value-sql'>" + entry.object.sql + "</span><br />").appendTo(dom);
            }
            if (entry.object.exception) {
                $("<span class='var-name'>Exception</span><span class='var-value-exception'>" + entry.object.exception.message + "</span><br />").appendTo(dom);
                for (var i=0; i < entry.object.exception.trace.length; i++ ) {
                    $("<span class='var-trace-line'></span>").text(entry.object.exception.trace[i].line).appendTo(dom);
                    $("<span class='var-trace-file'></span>").text(entry.object.exception.trace[i].file).appendTo(dom);
                    $("<br />").appendTo(dom);
                }
            }

            // Iterating over other fields
            for (var index in entry.object) {
                if (index == 'eos-id' || index == 'message' || index == 'time' || index == 'sql' || index == 'count' || index == 'exception') {
                    // already displayed
                    continue;
                }
                $("<span class='var-name'>" + index + "</span><span class='var-value'>" + entry.object[index] + "</span><br />").appendTo(dom);
            }
        }

        return dom;
    };

    return ui;
});