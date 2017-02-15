
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const autorun = $$('code[data-autorun]');
for (let i = 0; i < autorun.length; i++) {
    eval(autorun[i].innerHTML);
}

const buttons = $$('button[data-code]');
for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
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
