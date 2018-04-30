delete require.cache[require.resolve('..')];
var doesNotReject = require('..');
var assert = require('assert');

var subjects = [
  {name: 'npm module', rejects: doesNotReject.rejects}
];
if (typeof assert.rejects === 'function') {
  subjects.push({name: 'official implementation', rejects: assert.rejects});
}

function willReject (millis, value) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      reject(value);
    }, millis);
  });
}

function willResolve (millis, value) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve(value);
    }, millis);
  });
}

function shouldNotBeFulfilled (args) {
  assert(false, 'should not be fulfilled: ' + args);
}

function shouldNotBeRejected (args) {
  assert(false, 'should not be rejected: ' + args);
}

subjects.forEach(function (subject) {
  var name = subject.name;
  var rejects = subject.rejects;

  describe(name, function () {
    describe('#rejects', function () {
      describe('block argument', function () {
        describe('when <Promise>', function () {
          it('rejects with AssertionError if the block promise is not rejected.', function () {
            return rejects(willResolve(100, 'GOOD!')).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert.equal(err.message, 'Missing expected rejection.');
            });
          });
          it('Awaits the block promise then check that the promise is rejected.', function () {
            return rejects(willReject(100, 'BOMB!')).then(function () {
              assert(true);
            }, shouldNotBeRejected);
          });
        });
        describe('when <Function>', function () {
          it('rejects with AssertionError if result of block function is not rejected.', function () {
            return rejects(function () {
              return willResolve(100, 'GOOD!');
            }).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert.equal(err.message, 'Missing expected rejection.');
            });
          });
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
        describe('when types other than Promise or Function', function () {
          it('string', function () {
            return rejects('not a promise or function').then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof TypeError);
              assert(err.code === 'ERR_INVALID_ARG_TYPE');
              assert.equal(err.message, 'The "block" argument must be one of type Function or Promise. Received type string');
            });
          });
          it('number', function () {
            return rejects(9999).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof TypeError);
              assert(err.code === 'ERR_INVALID_ARG_TYPE');
              assert.equal(err.message, 'The "block" argument must be one of type Function or Promise. Received type number');
            });
          });
          it('null', function () {
            return rejects(null).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof TypeError);
              assert(err.code === 'ERR_INVALID_ARG_TYPE');
              assert.equal(err.message, 'The "block" argument must be one of type Function or Promise. Received type object');
            });
          });
        });
      });
      describe('[error] argument', function () {
        describe('when <RegExp>, validate error message using RegExp. Using a regular expression runs .toString on the error object, and will therefore also include the error name.', function () {
          it('when message matches, resolves with undefined', function () {
            return rejects(
              willReject(100, new Error('Wrong value')),
              /^Error: Wrong value$/
            ).then(function (nothing) {
              assert(nothing === undefined);
            }, shouldNotBeRejected);
          });
          it('when messages does not match, rejects with the original error', function () {
            return rejects(
              willReject(100, new Error('the original error message')),
              /^will not match$/
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof Error);
              assert.equal(err.message, 'the original error message');
            });
          });
        });
      });
    });
  });
});
