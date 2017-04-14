const root = window as any;

// IE 9-11 are missing Promise
// Need for play sounds before load
if (typeof root.Promise === undefined) {
    root.Promise = require('promise-polyfill');
}
