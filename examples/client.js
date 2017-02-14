
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

$$('code[data-autorun]').forEach((code) => {
    eval(code.innerHTML);
});
$$('button[data-code]').forEach((button) => {
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
});

hljs.initHighlightingOnLoad();