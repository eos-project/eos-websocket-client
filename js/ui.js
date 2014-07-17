define(['underscore', 'jquery'], function(_, $) {

    var ui = {
        logWindow: null
    };

    ui.getGroup = function getGroup(name) {
        var x = ui.logWindow.find("#" + name);
        if (x.size() === 0) {
            x = ui.buildGroup(name);
        }

        return x;
    };

    ui.buildGroup = function buildGroup(name) {
        var x = $("<div></div>").addClass("group");
        x.attr("id", name);

        var title = $("<div></div>").addClass("header").click(ui.toggleGroup).appendTo(x);
        $("<span></span>").addClass("toggle").text(" [...] ").appendTo(title);
        $("<span></span>").addClass("title").text(name).appendTo(title);
        $("<span></span>").addClass("count").appendTo(title);
        x.appendTo(ui.logWindow);

        return x;
    };

    ui.buildLogEntry = function buildLogEntry(entry) {
        var dom = $('<div></div>').addClass("entry");
        $('<span></span>').addClass("index").text(entry.index + ". ").appendTo(dom);
        $('<span></span>').addClass("time").text(entry.receivedAt.getSeconds() + "." + entry.receivedAt.getMilliseconds()).appendTo(dom);
        $('<span></span>').addClass("message").text(entry.getShortMessage()).appendTo(dom);

        return dom;
    };

    ui.addNewLogEntry = function addNewLogEntry(entry, group) {
        var gDom = ui.getGroup(group.id);
        gDom.find(".count").text(group.count);
        ui.buildLogEntry(entry).appendTo(gDom);
    };

    ui.toggleGroup = function toggleGroup() {
        $(this).parent().toggleClass("hiddenGroup");
    };

    return ui;
});