
var $ = document.querySelector.bind(document);
var $$ = document.querySelectorAll.bind(document);

var autorun = $$('code[data-autorun]');
for (var i = 0; i < autorun.length; i++) {
    eval(autorun[i].innerHTML);
}

var buttons = $$('button[data-code]');
for (var i = 0; i < buttons.length; i++) {
    var button = buttons[i];
    button.dataset.codeContent = $(button.dataset.code).innerHTML;
    if (button.dataset.beforecode) {
        button.dataset.beforecodeContent = $(button.dataset.beforecode).innerHTML;
    }
    button.addEventListener('click', function(){
        PIXI.loader.reset();
        PIXI.sound.stopAll();
        PIXI.sound.removeAll();
        if (button.dataset.beforecodeContent) {
            eval(this.dataset.beforecodeContent);
        }
        eval(this.dataset.codeContent);
    });
}

hljs.initHighlightingOnLoad();
