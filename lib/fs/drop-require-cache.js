'use strict';

const clearRequire = require('clear-require');

const deprecate = require('../utils/deprecate');

deprecate({
    module: 'enb/lib/fs/drop-require-cache',
    replaceModule: 'clear-require'
});

module.exports = (require, path) => {
    clearRequire(path);
};
