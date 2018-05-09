rejected-or-not
=======================================

Promise-based implementation of Node v10's [`assert.rejects()`](https://nodejs.org/api/assert.html#assert_assert_rejects_block_error_message) and [`assert.doesNotReject()`](https://nodejs.org/api/assert.html#assert_assert_doesnotreject_block_error_message) for old Nodes and browsers.

[![Build Status][travis-image]][travis-url]
[![NPM version][npm-image]][npm-url]
[![License][license-image]][license-url]

*Issues and improvements should be done in [Node.js](https://github.com/nodejs/node/issues) first.*


API
---------------------------------------

- [`rejects(block, [error], [message])`](https://nodejs.org/api/assert.html#assert_assert_rejects_block_error_message)
- [`doesNotReject(block, [error], [message])`](https://nodejs.org/api/assert.html#assert_assert_doesnotreject_block_error_message)


USAGE
---------------------------------------

```javascript
const assert = require('assert');
const {rejects, doesNotReject} = require('rejected-or-not');

const funcToBeResolved = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve('Resolved!'), 10);
  });
};

const promiseToBeRejected = new Promise((resolve, reject) => {
  setTimeout(() => {
    const te = new TypeError('Invalid arg type');
    te.code = 'ERR_INVALID_ARG_TYPE';
    return reject(te);
  }, 10);
});

(async () => {
  await rejects(funcToBeResolved).catch((err) => {
    assert(err instanceof assert.AssertionError);
    assert(err.message === 'Missing expected rejection.');
  });
  await rejects(promiseToBeRejected).then(() => {
    // resolves when rejected
  });
})();
```


INSTALL
---------------------------------------

```
npm install rejected-or-not
```


AUTHOR
---------------------------------------
* [Takuto Wada](https://github.com/twada)


LICENSE
---------------------------------------
Licensed under the [MIT](https://github.com/twada/rejected-or-not/blob/master/LICENSE) license.

[travis-url]: https://travis-ci.org/twada/rejected-or-not
[travis-image]: https://secure.travis-ci.org/twada/rejected-or-not.svg?branch=master

[npm-url]: https://npmjs.org/package/rejected-or-not
[npm-image]: https://badge.fury.io/js/rejected-or-not.svg

[license-url]: https://github.com/twada/rejected-or-not/blob/master/LICENSE
[license-image]: https://img.shields.io/badge/license-MIT-brightgreen.svg
