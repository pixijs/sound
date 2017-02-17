declare module 'uuid/v4' {
    function current(options?: any, buf?: Buffer, offset?: number): string;
    export = current;
}
