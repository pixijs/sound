var $ = document.querySelector.bind(document);
var $$ = document.querySelectorAll.bind(document);

var sound = PIXI.sound.add('music', {
    url: 'resources/musical.mp3',
    singleInstance: true,
    loop: true
});

var allFilters = [];
var allFiltersMap = {};

$('#play').addEventListener('click', function() {
    sound.play();
});

$('#stop').addEventListener('click', function() {
    sound.stop();
});

try {
    sortable('.filter-list', {
        forcePlaceholderSize: true,
        handle: '.handle'
    })[0].addEventListener('sortupdate', function(e) {
        var ul = e.detail.startparent;
        for (var i = 0; i < ul.children.length; i++) {
            var li = ul.children[i];
            allFiltersMap[li.getAttribute('data-id')].index = i;
        }
        refresh();
    });
}
catch(e) {
    // not support in IE 9
    console.warn('Sortable not supported in this browser');
}


var checks = $$('.filter');
for (var i = 0; i < checks.length; i++) {
    var filter = checks[i];
    var controller = {
        name: filter.getAttribute('data-id'),
        filter: new PIXI.sound.filters[filter.getAttribute('data-id')](),
        index: i,
        enabled: false
    };
    allFiltersMap[filter.getAttribute('data-id')] = controller;
    allFilters.push(controller);
    filter.addEventListener('change', toggle.bind(null, controller));
}

function toggle(controller, e) {
    controller.enabled = e.currentTarget.checked;
    refresh();
}

var output = $('#output');
var ranges = $$('input[type="range"]');

function refresh() {

    for (var i = 0; i < ranges.length; i++) {
        var range = ranges[i];
        var controller = allFiltersMap[range.getAttribute('data-id')];
        if (controller.enabled) {
            controller.filter[range.getAttribute('data-prop')] = parseFloat(range.value);
        }
    }

    var buffer = "const sound = PIXI.sound.add('music', 'resources/musical.mp3');\n";
    var inserts = [];

    sound.filters = allFilters.sort(function(a, b) {
        return a.index - b.index;
    }).filter(function(controller) {
        return controller.enabled;
    }).map(function(controller) {
        var args = [];
        var show = false;
        for (var i = 0; i < ranges.length; i++) {
            var range = ranges[i];
            if (range.getAttribute('data-id') !== controller.name) {
                continue;
            }
            if (range.value !== range.getAttribute('data-default')) {
                show = true;
            }
            args[parseInt(range.getAttribute('data-index'))] = range.value;
        }
        inserts.push('new PIXI.sound.filters.' + controller.name + '(' + (show ? args.join(', ') : '') + ')');
        return controller.filter;
    });
    if (inserts.length) {
        var nl = inserts.length > 1 ? '\n' : '';
        var spacer = inserts.length > 1 ? '  ': '';
        buffer += 'sound.filters = [' + nl + spacer + inserts.join(',\n' + spacer) + nl + '];\n';
    }
    buffer += "sound.play();";
    output.innerHTML = buffer;
    hljs.highlightBlock(output);
}

refresh();

for (var i = 0; i < ranges.length; i++) {
    ranges[i].addEventListener('change', refresh, false);
    ranges[i].addEventListener('input', refresh, false);
}
