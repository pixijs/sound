
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const sound = PIXI.sound.add('music', {
    url: 'resources/musical.mp3',
    loop: true
});

$('#play').addEventListener('click', function() {
    sound.play();
});

$('#stop').addEventListener('click', function() {
    sound.stop();
});

sortable('.filter-list', {
    forcePlaceholderSize: true,
    handle: '.handle'
})[0].addEventListener('sortupdate', function(e) {
    const ul = e.detail.startparent;
    for (let i = 0; i < ul.children.length; i++) {
        const li = ul.children[i];
        filtersMap[li.dataset.id].index = i;
    }
    refresh();
});

const filters = [];
const filtersMap = {};

const checks = $$('.filter');
for (let i = 0; i < checks.length; i++) {
    const filter = checks[i];
    const name = filter.dataset.filter;
    const controller = {
        name: name,
        filter: new PIXI.sound.filters[name](),
        index: i,
        enabled: false
    };
    filtersMap[name] = controller;
    filters.push(controller);
    filter.addEventListener('change', function(e) {
        controller.enabled = e.currentTarget.checked;
        refresh();
    });
}
console.log(filtersMap);

const output = $('#output');

function refresh() {

    let buffer = "const sound = PIXI.sound.add('music', 'resources/musical.mp3');\n";
    let inserts = [];

    sound.filters = filters.sort(function(a, b) {
        return a.index - b.index;
    }).filter(function(controller) {
        return controller.enabled;
    }).map(function(controller) {
        inserts.push('new PIXI.sound.filters.' + controller.name + '()');
        return controller.filter;
    });
    if (inserts.length) {
        const nl = inserts.length > 1 ? '\n' : '';
        const spacer = inserts.length > 1 ? '  ': '';
        buffer += 'sound.filters = [' + nl + spacer + inserts.join(',\n' + spacer) + nl + '];\n';
    }
    buffer += "sound.play();";
    output.innerHTML = buffer;
    hljs.highlightBlock(output);
}

refresh();

