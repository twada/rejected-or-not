rejected-or-not
=======================================

Promise-based implementation of Node v10's [`assert.rejects()`](https://nodejs.org/api/assert.html#assert_assert_rejects_block_error_message) and [`assert.doesNotReject()`](https://nodejs.org/api/assert.html#assert_assert_doesnotreject_block_error_message) for old Nodes and browsers.

[![Build Status][travis-image]][travis-url]
[![NPM version][npm-image]][npm-url]
[![License][license-image]][license-url]

*Issues and improvements should be done in [Node.js](https://github.com/nodejs/node/issues) first.*


INSTALL
---------------------------------------

```
npm install rejected-or-not
```


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


SPEC
---------------------------------------

### `rejects(block, [error], [message])`
  - block `<Function> | <Promise>`
    - if `block` is a `<Promise>`, awaits the block promise then check that the promise is rejected.
      - rejects with AssertionError if the block promise is not rejected.
      - resolves if the block promise is rejected.
    - if `block` is a `<Function>`, immediately calls the function and awaits the returned promise to complete. It will then check that the promise is rejected.
      - rejects with AssertionError if result of block function is NOT rejected.
      - resolves if result of block function is rejected.
      - if block is a function and it throws an error synchronously, `rejects()` will return a rejected Promise with that error.
      - if the function does not return a promise, `rejects()` will return a rejected Promise with `ERR_INVALID_RETURN_VALUE` TypeError.
    - if type of `block` is other than `<Promise>` or `<Function>`, `rejects()` will return a rejected Promise with `ERR_INVALID_ARG_TYPE` TypeError.
  - error `<RegExp> | <Class> | <Function> | <Object> | <Error>`
    - if `error` is a `<RegExp>`, validate error message using RegExp. Using a regular expression runs `.toString()` on the error object, and will therefore also include the error name.
      - when message matches, resolves with undefined.
      - when messages does not match, rejects with the original error.
    - if `error` is a `<Class>` (constructor function), validate instanceof using constructor (works well with ES2015 classes that extends Error).
      - when rejected error is an instanceof `<Class>`, resolves with undefined.
      - when rejected error is NOT an instanceof `<Class>`, rejects with the original error.
      - appends `error.name` as expected error class name to the message if the `block` is not rejected.
    - if `error` is a `<Function>`, run custom validation against actual rejection result
      - when validation function returns `true`, resolves with undefined.
      - when returned value of validation function is NOT `true`, rejects with the original error.
      - if Error is thrown from validation function, rejects with the error.
    - if `error` is an `<Object>`, that is an object where each property will be tested for.
      - when all key-value pairs in `error` are the same as actual rejected result, resolves with undefined. Note that only properties on the error object will be tested.
      - when some of the properties are not same, rejects with AssertionError
      - when rejected result does not have property that `error` have, rejects with AssertionError.
      - if exists, appends `error.name` as expected error class name to the message if the `block` is not rejected.
    - if `error` is an `<Error>`, that is an instance of error where each property will be tested for, including the non-enumerable message and name properties.
      - when all key-value pairs in `error` (error instance in this case) are the same as actual rejected error, resolves with undefined. Note that only properties on the `error` will be tested.
      - when some of the properties are not same, rejects with AssertionError.
      - appends `error.name` as expected error class name to the message if the `block` is not rejected.
    - note that `error` cannot be a string.
      - if a string is provided as the second argument,
        - and the third argument is not given, then `error` is assumed to be omitted and the string will be used for `message` instead. This can lead to easy-to-miss mistakes.
        - and the third argument is also given, reject TypeError with code `ERR_INVALID_ARG_TYPE`.
        - and is identical to the message property of actual rejected error, reject TypeError with code `ERR_AMBIGUOUS_ARGUMENT`.
        - and is identical to the actual rejected object, reject TypeError with code `ERR_AMBIGUOUS_ARGUMENT`.
  - message `<any>`
    - if specified, `message` will be the message provided by the AssertionError if the `block` fails to reject.
    - when `error` is one of `<Class>`, `<Error>` or `<Object>` with `name` property, append it as expected error class name to the assertion message
    - `message` argument is also used with `error` of type `<Object>` or `<Error>`
      - when `error` is an `<Object>` and comparison fails, rejects AssertionError with specified failure message
      - when `error` is an `<Error>` and comparison fails, rejects AssertionError with specified failure message

### `doesNotReject(block, [error], [message])`
  - block `<Function> | <Promise>`
    - if `block` is a `<Promise>`, awaits the promise then check that the promise is NOT rejected.
      - rejects with AssertionError if the `block` is rejected.
      - resolves if the `block` is not rejected.
    - if `block` is a `<Function>`, immediately calls the function and awaits the returned promise to complete. It will then check that the promise is NOT rejected.
      - rejects with AssertionError if the promise returned from `block` is rejected.
      - resolves if the promise returned from `block` is not rejected.
      - if `block` is a function and it throws an error synchronously, `doesNotReject()` will return a rejected Promise with that error.
      - if the function does not return a promise, `doesNotReject()` will return a rejected Promise with an ERR_INVALID_RETURN_VALUE TypeError.
    - if type of `block` is other than `<Promise>` or `<Function>`, `doesNotReject()` will return a rejected Promise with an `ERR_INVALID_ARG_TYPE` TypeError.
  - error `<RegExp> | <Class> | <Function>`
    - if `error` is a `<RegExp>`, validate rejected error message using RegExp. Using a regular expression runs `.toString()` on the error object, and will therefore also include the error name.
      - when message matches, rejects with AssertionError.
      - when message does not match, rejects with original error.
    - if `error` is a `<Class>` (constructor function), validate instanceof using constructor (works well with ES2015 classes that extends Error).
      - when rejected error is an instanceof `<Class>`, rejects with AssertionError.
      - when rejected error is NOT an instanceof `<Class>`, rejects with the original error.
    - if `error` is a `<Function>`, run custom validation against rejection result
      - when validation function returns `true`, rejects with AssertionError
      - when returned value of validation function is NOT `true`, rejects with the original error
      - if Error is thrown from validation function, rejects with the error
    - note that `error` cannot be a string.
      - if a string is provided as the second argument,
        - and the third argument is not given, then `error` is assumed to be omitted and the string will be used for `message` instead. This can lead to easy-to-miss mistakes.
        - and the third argument is also given, third argument is just ignored.
  - message <any>
    - if an AssertionError is thrown and a value is provided for the message parameter, the value of message will be appended to the AssertionError message


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
