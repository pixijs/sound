declare module 'web-audio-ios' {
    function current(html:HTMLElement|Window, context:AudioContext, callback:() => void): void;
    export = current;
}