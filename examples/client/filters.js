var $ = document.querySelector.bind(document);
var $$ = document.querySelectorAll.bind(document);

var sound = PIXI.sound.add("music", {
    url: "resources/musical.mp3",
    singleInstance: true,
    loop: true,
});

var allFilters = [];
var allFiltersMap = {};
var controller;

$("#play").addEventListener("click", function() {
    sound.play();
});

$("#stop").addEventListener("click", function() {
    sound.stop();
});

try {
    sortable(".filter-list", {
        forcePlaceholderSize: true,
        handle: ".handle",
    })[0].addEventListener("sortupdate", function(e) {
        var ul = e.detail.startparent;
        for (var j = 0; j < ul.children.length; j++) {
            var li = ul.children[j];
            allFiltersMap[li.getAttribute("data-id")].index = j;
        }
        refresh();
    });
}
catch (e) {
    // not support in IE 9
    // Sortable not supported in this browser
}

var checks = $$(".filter");
for (var k = 0; k < checks.length; k++) {
    var filter = checks[k];
    controller = {
        name: filter.getAttribute("data-id"),
        filter: new PIXI.sound.filters[filter.getAttribute("data-id")](),
        index: k,
        enabled: false,
    };
    allFiltersMap[filter.getAttribute("data-id")] = controller;
    allFilters.push(controller);
    filter.addEventListener("change", toggle.bind(null, controller));
}

function toggle(ctrl, e) {
    ctrl.enabled = e.currentTarget.checked;
    refresh();
}

var output = $("#output");
var ranges = $$('input[type="range"]');

function refresh() {

    for (var n = 0; n < ranges.length; n++) {
        var range = ranges[n];
        controller = allFiltersMap[range.getAttribute("data-id")];
        if (controller.enabled) {
            controller.filter[range.getAttribute("data-prop")] = parseFloat(range.value);
        }
    }

    var buffer = "const sound = PIXI.sound.add('music', 'resources/musical.mp3');\n";
    var inserts = [];

    sound.filters = allFilters.sort(function(a, b) {
        return a.index - b.index;
    }).filter(function(ctrl) {
        return ctrl.enabled;
    }).map(function(ctrl) {
        var args = [];
        var show = false;
        for (var m = 0; m < ranges.length; m++) {
            var range1 = ranges[m];
            if (range1.getAttribute("data-id") !== ctrl.name) {
                continue;
            }
            if (range1.value !== range1.getAttribute("data-default")) {
                show = true;
            }
            args[parseInt(range1.getAttribute("data-index"), 10)] = range1.value;
        }
        inserts.push("new PIXI.sound.filters." + ctrl.name + "(" + (show ? args.join(", ") : "") + ")");
        return ctrl.filter;
    });
    if (inserts.length) {
        var nl = inserts.length > 1 ? "\n" : "";
        var spacer = inserts.length > 1 ? "  " : "";
        buffer += "sound.filters = [" + nl + spacer + inserts.join(",\n" + spacer) + nl + "];\n";
    }
    buffer += "sound.play();";
    output.innerHTML = buffer;
    hljs.highlightBlock(output);
}

refresh();

for (var i = 0; i < ranges.length; i++) {
    ranges[i].addEventListener("change", refresh, false);
    ranges[i].addEventListener("input", refresh, false);
}
