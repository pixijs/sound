
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

$$('button[data-code]').forEach((button) => {
    button.dataset.codeContent = $(button.dataset.code).innerHTML;
    button.addEventListener('click', function(){
        PIXI.sound.stopAll();
        PIXI.sound.removeAll();
        eval(this.dataset.codeContent);
    });
});

hljs.initHighlightingOnLoad();