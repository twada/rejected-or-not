delete require.cache[require.resolve('..')];
var doesNotReject = require('..');
var assert = require('assert');

var subjects = [
  {name: 'npm module', rejects: doesNotReject.rejects}
];
if (typeof assert.rejects === 'function') {
  subjects.push({name: 'official implementation', rejects: assert.rejects});
}

function willReject (value) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      reject(value);
    }, 10);
  });
}

function willResolve (value) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve(value);
    }, 10);
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
    describe('#rejects(block, [error], [message])', function () {
      describe('block argument', function () {
        describe('when <Promise>', function () {
          it('rejects with AssertionError if the block promise is not rejected.', function () {
            return rejects(willResolve('GOOD!')).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert.equal(err.message, 'Missing expected rejection.');
            });
          });
          it('Awaits the block promise then check that the promise is rejected.', function () {
            return rejects(willReject('BOMB!')).then(function () {
              assert(true);
            }, shouldNotBeRejected);
          });
        });
        describe('when <Function>', function () {
          it('rejects with AssertionError if result of block function is not rejected.', function () {
            return rejects(function () {
              return willResolve('GOOD!');
            }).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert.equal(err.message, 'Missing expected rejection.');
            });
          });
          it('if block is a function, immediately calls the function and awaits the returned promise to complete. It will then check that the promise is rejected.', function () {
            return rejects(function () {
              return willReject('BOMB!');
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
              assert.equal(err.message, 'Expected instance of Promise to be returned from the "block" function but got instance of String.');
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
              willReject(new Error('Wrong value')),
              /^Error: Wrong value$/
            ).then(function (nothing) {
              assert(nothing === undefined);
            }, shouldNotBeRejected);
          });
          it('when messages does not match, rejects with the original error', function () {
            return rejects(
              willReject(new Error('the original error message')),
              /^will not match$/
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof Error);
              assert.equal(err.message, 'the original error message');
            });
          });
        });
        describe('when <Class>, validate instanceof using constructor', function () {
          it('when rejected error is an instanceof <Class>, resolves with undefined', function () {
            return rejects(
              willReject(new TypeError('Wrong type')),
              Error
            ).then(function (nothing) {
              assert(nothing === undefined);
            }, shouldNotBeRejected);
          });
          it('when rejected error is NOT an instanceof <Class>, rejects with the original error', function () {
            return rejects(
              willReject(new Error('the original error message')),
              TypeError
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof Error);
              assert.equal(err.message, 'the original error message');
            });
          });
          it('appends `<Class>.name` as expected error class name to the message if the `block` is not rejected.', function () {
            return rejects(
              willResolve('GOOD!'),
              TypeError
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert.equal(err.message, 'Missing expected rejection (TypeError).');
            });
          });
        });
        describe('when <Function>, run custom validation against rejection result', function () {
          it('when validation function returns `true`, resolves with undefined', function () {
            return rejects(
              willReject(new Error('Wrong value')),
              function (err) {
                return ((err instanceof Error) && /value/.test(err));
              }
            ).then(function (nothing) {
              assert(nothing === undefined);
            }, shouldNotBeRejected);
          });
          it('when returned value of validation function is NOT `true`, rejects with the original error', function () {
            return rejects(
              willReject(new Error('the original error message')),
              function (err) {
                return ((err instanceof TypeError) && /type/.test(err));
              }
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof Error);
              assert.equal(err.message, 'the original error message');
            });
          });
        });
        describe('when <Object>, that is an object where each property will be tested for', function () {
          it('when all key-value pairs in errorHandler are the same as actual rejected result, resolves with undefined. Note that only properties on the error object will be tested.', function () {
            var te = new TypeError('Wrong type');
            te.code = 'ERR_INVALID_ARG_TYPE';
            return rejects(
              willReject(te),
              {
                name: 'TypeError',
                code: 'ERR_INVALID_ARG_TYPE'
              }
            ).then(function (nothing) {
              assert(nothing === undefined);
            }, shouldNotBeRejected);
          });
          it('when some of the properties are not same, rejects with AssertionError', function () {
            var te = new TypeError('Wrong type');
            te.code = 'ERR_INVALID_ARG_TYPE';
            return rejects(
              willReject(te),
              {
                name: 'Error',
                message: 'Wrong type',
                code: 'ERR_INVALID_RETURN_VALUE'
              }
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert(err.actual === te);
            });
          });
          it('when rejected result does not have property that errorHandler have, rejects with AssertionError', function () {
            var te = new TypeError('Wrong type');
            return rejects(
              willReject(te),
              {
                name: 'TypeError',
                reason: 'Some reason'
              }
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert(err.actual === te);
            });
          });
          it('appends `<Object>.name` as expected error class name to the message if the `block` is not rejected.', function () {
            return rejects(
              willResolve('GOOD!'),
              {
                name: 'TypeError',
                code: 'ERR_INVALID_ARG_TYPE'
              }
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert.equal(err.message, 'Missing expected rejection (TypeError).');
            });
          });
        });
        describe('when <Error>, that is an instance of error where each property will be tested for including the non-enumerable message and name properties.', function () {
          it('when all key-value pairs in errorHandler (error instance in this case) are the same as actual rejected error, resolves with undefined. Note that only properties on the errorHandler object will be tested.', function () {
            var te = new TypeError('Wrong type');
            te.code = 'ERR_INVALID_ARG_TYPE';
            return rejects(
              willReject(te),
              new TypeError('Wrong type')
            ).then(function (nothing) {
              assert(nothing === undefined);
            }, shouldNotBeRejected);
          });
          it('when some of the properties are not same, rejects with AssertionError', function () {
            var otherErr = new Error('Not found');
            otherErr.code = 404;
            return rejects(
              willReject(otherErr),
              new TypeError('Wrong type')
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert(err.actual === otherErr);
            });
          });
          it('appends `<Error>.name` as expected error class name to the message if the `block` is not rejected.', function () {
            return rejects(
              willResolve('GOOD!'),
              new TypeError('Wrong type')
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert.equal(err.message, 'Missing expected rejection (TypeError).');
            });
          });
        });
        describe('Note that `error` cannot be a string.', function () {
          it('If a string is provided as the second argument, then `error` is assumed to be omitted and the string will be used for `message` instead. This can lead to easy-to-miss mistakes.', function () {
            return rejects(
              willResolve('GOOD!'),
              'This can lead to easy-to-miss mistakes.'
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert.equal(err.message, 'Missing expected rejection: This can lead to easy-to-miss mistakes.');
            });
          });
          it('If a string is provided as the second argument and the third argument is also given, theow TypeError with code ERR_INVALID_ARG_TYPE', function () {
            return rejects(
              willResolve('GOOD!'),
              'This can lead to easy-to-miss mistakes.',
              'This is clearly a mistake.'
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof TypeError);
              assert.equal(err.message, 'The "error" argument must be one of type Object, Error, Function, or RegExp. Received type string');
            });
          });
        });
      });
      describe('[message] argument', function () {
        describe('If specified, message will be the message provided by the AssertionError if the block fails to reject.', function () {
          it('with expected error class name (when `error` is one of <Class>, <Error> or <Object> with name property)', function () {
            return rejects(
              willResolve('GOOD!'),
              TypeError,
              'MUST BE REJECTED but resolved'
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert.equal(err.message, 'Missing expected rejection (TypeError): MUST BE REJECTED but resolved');
            });
          });
          it('without expected error class name (when `error` is RegExp or Fuction)', function () {
            return rejects(
              willResolve('GOOD!'),
              /Wrong value/,
              'MUST BE REJECTED but resolved'
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert.equal(err.message, 'Missing expected rejection: MUST BE REJECTED but resolved');
            });
          });
        });
        describe('`message` argument is also used with `error` of type <Object> or <Error>', function () {
          it('when `error` is an <Object> and comparison fails, rejects AssertionError with specified failure message', function () {
            var te = new TypeError('Wrong type');
            te.code = 'ERR_INVALID_ARG_TYPE';
            return rejects(
              willReject(te),
              {
                code: 'ERR_INVALID_RETURN_VALUE'
              },
              'rejected error must have code ERR_INVALID_RETURN_VALUE'
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert(err.actual === te);
              assert.equal(err.message, 'rejected error must have code ERR_INVALID_RETURN_VALUE');
            });
          });
          it('when `error` is an <Error> and comparison fails, rejects AssertionError with specified failure message', function () {
            var e = new Error('Wrong value');
            return rejects(
              willReject(e),
              new TypeError('Wrong type'),
              'rejected error must be TypeError with message `Wrong type`'
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert(err.actual === e);
              assert.equal(err.message, 'rejected error must be TypeError with message `Wrong type`');
            });
          });
        });
      });
    });
  });
});
