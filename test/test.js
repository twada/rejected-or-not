delete require.cache[require.resolve('..')];
var doesNotReject = require('..');
var rejects = doesNotReject.rejects;
var assert = require('assert');

function willReject (millis, value) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(value);
        }, millis);
    });
};

function shouldNotBeFulfilled (args) {
  assert(false, 'should not be fulfilled: ' + args);
}

function shouldNotBeRejected (args) {
  assert(false, 'should not be rejected: ' + args);
}

describe('#rejects', function () {
    it('if block is a function, immediately calls the function and awaits the returned promise to complete. It will then check that the promise is rejected.', function () {
        return rejects(function () {
            return willReject(100, 'BOMB!');
        }).then(function () {
            assert(true);
        }, shouldNotBeRejected);
    });
    it('If block is a function and it throws an error synchronously, assert.rejects() will return a rejected Promise with that error.', function () {
        return rejects(function () {
            throw new Error('synchronous error');
        }).then(shouldNotBeFulfilled, function (err) {
            assert(err instanceof Error);
            assert(err.message === 'synchronous error');
        });
    });
    it('If the function does not return a promise, assert.rejects() will return a rejected Promise with an ERR_INVALID_RETURN_VALUE error.', function () {
        return rejects(function () {
            return 'not a Promise';
        }).then(shouldNotBeFulfilled, function (err) {
            assert(err instanceof TypeError);
            assert(err.code === 'ERR_INVALID_RETURN_VALUE');
        });
    });
});
