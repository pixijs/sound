jQuery(".section-tabs").stickyTabs();

var $ = document.querySelector.bind(document);
var $$ = document.querySelectorAll.bind(document);

var autorun = $$("code[data-autorun]");
for (var j = 0; j < autorun.length; j++) {
    // tslint:disable-next-line no-eval
    eval(autorun[j].innerHTML);
}

var buttons = $$("button[data-code]");
for (var i = 0; i < buttons.length; i++) {
    var button = buttons[i];
    var beforecode = button.getAttribute("data-beforecode");
    var code = button.getAttribute("data-code");
    button.setAttribute("data-codeContent", $(code).innerHTML);
    if (beforecode) {
        button.setAttribute("data-beforecodeContent", $(beforecode).innerHTML);
    }
    button.addEventListener("click", function() {
        PIXI.Loader.shared.reset();
        PIXI.sound.stopAll();
        PIXI.sound.removeAll();
        var beforecodeContent = this.getAttribute("data-beforecodeContent");
        var codeContent = this.getAttribute("data-codeContent");
        if (beforecodeContent) {
            // tslint:disable-next-line no-eval
            eval(beforecodeContent);
        }
        // tslint:disable-next-line no-eval
        eval(codeContent.replace(/const /g, "var "));
    });
}

hljs.initHighlightingOnLoad();
