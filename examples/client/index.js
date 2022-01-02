jQuery('.section-tabs').stickyTabs();

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const autorun = $$('code[data-autorun]');

for (let j = 0; j < autorun.length; j++)
{
    // tslint:disable-next-line no-eval
    eval(autorun[j].innerHTML);
}

const buttons = $$('button[data-code]');

for (let i = 0; i < buttons.length; i++)
{
    const button = buttons[i];
    const beforecode = button.getAttribute('data-beforecode');
    const code = button.getAttribute('data-code');

    button.setAttribute('data-codeContent', $(code).innerHTML);
    if (beforecode)
    {
        button.setAttribute('data-beforecodeContent', $(beforecode).innerHTML);
    }
    button.addEventListener('click', function ()
    {
        PIXI.Loader.shared.reset();
        PIXI.sound.stopAll();
        PIXI.sound.removeAll();
        const beforecodeContent = this.getAttribute('data-beforecodeContent');
        let codeContent = this.getAttribute('data-codeContent');
        const id = code.substr(1, code.length);
        const textarea = $(`[data-id="${id}"]`);

        if (textarea)
        {
            codeContent = textarea.value;
        }
        if (beforecodeContent)
        {
            // tslint:disable-next-line no-eval
            eval(beforecodeContent);
        }
        // tslint:disable-next-line no-eval
        eval(codeContent.replace(/const /g, 'var '));
    });
}

const codeEls = $$('pre code');

for (let i = 0; i < codeEls.length; i++)
{
    const codeEl = codeEls[i];
    const textarea = document.createElement('textarea');

    textarea.setAttribute('data-id', codeEl.id);
    textarea.value = codeEl.innerHTML;
    codeEl.parentNode.insertBefore(textarea, codeEl);
    codeEl.parentNode.removeChild(codeEl);
    const cm = window.CodeMirror.fromTextArea(textarea, {
        mode: codeEl.className,
        autoRefresh: true,
        theme: 'monokai',
    });

    cm.on('blur', function ()
    {
        cm.save();
    });
}
