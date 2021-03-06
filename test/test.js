'use strict';

delete require.cache[require.resolve('..')];
var rejectedOrNot = require('..');
var assert = require('assert');
var semver = require('semver');

var implementations = [
  {
    name: 'rejected-or-not',
    rejects: rejectedOrNot.rejects,
    doesNotReject: rejectedOrNot.doesNotReject
  }
];
var node8rejects = semver.satisfies(process.version, '>= 8.13.0 < 9');
if (typeof assert.rejects === 'function' && !node8rejects) {
  implementations.push({
    name: 'official implementation',
    rejects: assert.rejects,
    doesNotReject: assert.doesNotReject
  });
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

implementations.forEach(function (impl) {
  var name = impl.name;
  var rejects = impl.rejects;
  var doesNotReject = impl.doesNotReject;

  describe(name, function () {
    describe('#rejects(promiseFn, [error], [message])', function () {
      describe('promiseFn `<Function> | <Promise>`', function () {
        describe('if `promiseFn` is a `<Promise>`, awaits the promise then check that the promise is rejected.', function () {
          it('rejects with AssertionError if the `promiseFn` is not rejected.', function () {
            return rejects(willResolve('GOOD!')).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert.equal(err.message, 'Missing expected rejection.');
            });
          });
          it('resolves if the `promiseFn` is rejected.', function () {
            return rejects(willReject('BOMB!')).then(function () {
              assert(true);
            }, shouldNotBeRejected);
          });
        });
        describe('if `promiseFn` is a `<Function>`, immediately calls the function and awaits the returned promise to complete. It will then check that the promise is rejected.', function () {
          it('rejects with AssertionError if result of `promiseFn` function is NOT rejected.', function () {
            return rejects(function () {
              return willResolve('GOOD!');
            }).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert.equal(err.message, 'Missing expected rejection.');
            });
          });
          it('resolves if result of `promiseFn` function is rejected.', function () {
            return rejects(function () {
              return willReject('BOMB!');
            }).then(function () {
              assert(true);
            }, shouldNotBeRejected);
          });
          it('if `promiseFn` is a function and it throws an error synchronously, `rejects()` will return a rejected Promise with that error.', function () {
            return rejects(function () {
              throw new RangeError('synchronous range error');
            }).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof RangeError);
              assert(err.message === 'synchronous range error');
            });
          });
          it('if the `promiseFn` function does not return a promise, `rejects()` will return a rejected Promise with `ERR_INVALID_RETURN_VALUE` TypeError.', function () {
            return rejects(function () {
              return 'not a Promise';
            }).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof TypeError);
              assert(err.code === 'ERR_INVALID_RETURN_VALUE');
              assert.equal(err.message, 'Expected instance of Promise to be returned from the "promiseFn" function but got instance of String.');
            });
          });
        });
        describe('if type of `promiseFn` is other than `<Promise>` or `<Function>`, `rejects()` will return a rejected Promise with `ERR_INVALID_ARG_TYPE` TypeError.', function () {
          it('string', function () {
            return rejects('not a promise or function').then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof TypeError);
              assert(err.code === 'ERR_INVALID_ARG_TYPE');
              if (impl.name === 'official implementation' && semver.satisfies(process.version, '< 12.0.0')) {
                assert.equal(err.message, 'The "promiseFn" argument must be one of type Function or Promise. Received type string');
              } else {
                assert(err.message.startsWith('The "promiseFn" argument must be of type function or an instance of Promise. Received type string'), `actual [${err.message}]`);
              }
            });
          });
          it('number', function () {
            return rejects(9999).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof TypeError);
              assert(err.code === 'ERR_INVALID_ARG_TYPE');
              if (impl.name === 'official implementation' && semver.satisfies(process.version, '< 12.0.0')) {
                assert.equal(err.message, 'The "promiseFn" argument must be one of type Function or Promise. Received type number');
              } else {
                assert(err.message.startsWith('The "promiseFn" argument must be of type function or an instance of Promise. Received type number'), `actual [${err.message}]`);
              }
            });
          });
          it('null', function () {
            return rejects(null).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof TypeError);
              assert(err.code === 'ERR_INVALID_ARG_TYPE');
              if (impl.name === 'official implementation' && semver.satisfies(process.version, '< 12.0.0')) {
                assert.equal(err.message, 'The "promiseFn" argument must be one of type Function or Promise. Received type object');
              } else {
                assert(err.message.startsWith('The "promiseFn" argument must be of type function or an instance of Promise. Received null'), `actual [${err.message}]`);
              }
            });
          });
        });
      });
      describe('error `<RegExp> | <Class> | <Function> | <Object> | <Error>`', function () {
        describe('if `error` is a `<RegExp>`, validate rejected actual error message using RegExp. Using a regular expression runs `.toString()` on the actual error object, and will therefore also include the error name.', function () {
          it('when message matches, resolves with undefined.', function () {
            return rejects(
              willReject(new TypeError('Wrong type')),
              /^TypeError: Wrong type$/
            ).then(function (nothing) {
              assert(nothing === undefined);
            }, shouldNotBeRejected);
          });
          // improvement of regular expression validation introduced in Node 12.5.0
          // see: https://github.com/nodejs/node/commit/ef8f147b7e
          if (impl.name === 'official implementation' && semver.satisfies(process.version, '< 12.5.0')) {
            it('when message does not match, rejects with the actual error.', function () {
              return rejects(
                willReject(new TypeError('the original error message')),
                 /^will not match$/
              ).then(shouldNotBeFulfilled, function (err) {
                assert(err instanceof TypeError);
                assert.equal(err.message, 'the original error message');
              });
            });
          } else {
            it('when message does not match, rejects with AssertionError.', function () {
              return rejects(
                willReject(new TypeError('the original error message')),
                /^will not match$/
              ).then(shouldNotBeFulfilled, function (err) {
                assert(err instanceof assert.AssertionError);
                assert.equal(err.message, "The input did not match the regular expression /^will not match$/. Input:\n\n'TypeError: the original error message'\n");
              });
            });
          }
        });
        describe('if `error` is a `<Class>` (constructor function), validate instanceof using constructor (works well with ES2015 classes that extends Error).', function () {
          it('when actual error is an instanceof `<Class>`, resolves with undefined.', function () {
            return rejects(
              willReject(new TypeError('Wrong type')),
              Error
            ).then(function (nothing) {
              assert(nothing === undefined);
            }, shouldNotBeRejected);
          });
          // < Node13
          if (impl.name === 'official implementation' && semver.satisfies(process.version, '< 13.0.0')) {
            it('when actual error is NOT an instanceof `<Class>`, rejects with the actual error.', function () {
              return rejects(
                willReject(new TypeError('the original error message')),
                RangeError
              ).then(shouldNotBeFulfilled, function (err) {
                assert(err instanceof TypeError);
                assert.equal(err.message, 'the original error message');
              });
            });
          } else {
            it('when actual error is NOT an instanceof `<Class>`, rejects with AssertionError.', function () {
              var te = new TypeError('the original error message');
              return rejects(
                willReject(te),
                RangeError
              ).then(shouldNotBeFulfilled, function (err) {
                assert(err instanceof assert.AssertionError);
                assert.equal(err.actual, te);
                assert.equal(err.expected, RangeError);
                assert(/The error is expected to be an instance of "RangeError". Received "TypeError"/.test(err.message));
                assert(/the original error message/.test(err.message));
              });
            });
          }
          describe('works well with ES2015 classes that extends Error', function () {
            class ES2015Error extends Error {
            }
            class AnotherES2015Error extends Error {
            }
            it('match case, resolves with undefined.', function () {
              return rejects(
                willReject(new ES2015Error('foo')),
                ES2015Error
              ).then(function (nothing) {
                assert(nothing === undefined);
              }, shouldNotBeRejected);
            });
            // < Node13
            if (impl.name === 'official implementation' && semver.satisfies(process.version, '< 13.0.0')) {
              it('unmatch case, rejects with the original error.', function () {
                return rejects(
                  willReject(new AnotherES2015Error('bar')),
                  ES2015Error
                ).then(shouldNotBeFulfilled, function (err) {
                  assert(err instanceof AnotherES2015Error);
                  assert.equal(err.message, 'bar');
                });
              });
            } else {
              it('unmatch case, rejects with AssertionError.', function () {
                var another = new AnotherES2015Error('bar');
                return rejects(
                  willReject(another),
                  ES2015Error
                ).then(shouldNotBeFulfilled, function (err) {
                  assert(err instanceof assert.AssertionError);
                  assert.equal(err.actual, another);
                  assert.equal(err.expected, ES2015Error);
                  assert(/The error is expected to be an instance of "ES2015Error". Received "AnotherES2015Error"/.test(err.message));
                  assert(/bar/.test(err.message));
                });
              });
            }
          });
          it('appends `error.name` as expected error class name to the message if the `promiseFn` is not rejected.', function () {
            return rejects(
              willResolve('GOOD!'),
              TypeError
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert.equal(err.message, 'Missing expected rejection (TypeError).');
            });
          });
        });
        describe('if `error` is a `<Function>`, run custom validation against actual rejection result.', function () {
          it('when validation function returns `true`, resolves with undefined.', function () {
            return rejects(
              willReject(new RangeError('Wrong range')),
              function (err) {
                return ((err instanceof RangeError) && /range/.test(err));
              }
            ).then(function (nothing) {
              assert(nothing === undefined);
            }, shouldNotBeRejected);
          });
          // < Node13
          if (impl.name === 'official implementation' && semver.satisfies(process.version, '< 13.0.0')) {
            it('when returned value of validation function is NOT `true`, rejects with the actual error.', function () {
              return rejects(
                willReject(new RangeError('Wrong range')),
                function (err) {
                  return ((err instanceof TypeError) && /type/.test(err));
                }
              ).then(shouldNotBeFulfilled, function (err) {
                assert(err instanceof RangeError);
                assert.equal(err.message, 'Wrong range');
              });
            });
          } else {
            it('when returned value of validation function is NOT `true`, rejects with AssertionError.', function () {
              var e = new RangeError('Wrong range');
              const handlerFn = (err) => {
                return ((err instanceof TypeError) && /type/.test(err));
              };
              return rejects(
                willReject(e),
                handlerFn
              ).then(shouldNotBeFulfilled, function (err) {
                assert(err instanceof assert.AssertionError);
                assert.equal(err.actual, e);
                assert.equal(err.expected, handlerFn);

                assert(/The "handlerFn" validation function is expected to return "true". Received false/.test(err.message), `actual [${err.message}]`);
                assert(/RangeError: Wrong range/.test(err.message), `actual [${err.message}]`);
              });
            });
          }
          it('if Error is thrown from validation function, rejects with the error.', function () {
            var e = new RangeError('the original error message');
            var te = new TypeError('some programming error');
            return rejects(
              willReject(e),
              function () {
                throw te;
              }
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof TypeError);
              assert(err === te);
              assert.equal(err.message, 'some programming error');
            });
          });
        });
        describe('if `error` is an `<Object>`, that is an object where each property will be tested for.', function () {
          it('when all key-value pairs in `error` are the same as key-value pairs from actual rejected result, resolves with undefined. Note that only properties on the error object will be tested.', function () {
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
          it('when some of the properties are not same, rejects with AssertionError.', function () {
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
          it('when actual result does not have property that `error` have, rejects with AssertionError.', function () {
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
          it('if exists, appends `error.name` as expected error class name to the message if the `promiseFn` is not rejected.', function () {
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
        describe('if `error` is an `<Error>`, that is an instance of error where each property will be tested for, including the non-enumerable message and name properties.', function () {
          it('when all key-value pairs in `error` (error instance in this case) are the same as actual error, resolves with undefined. Note that only properties on the `error` will be tested.', function () {
            var te = new TypeError('Wrong type');
            te.code = 'ERR_INVALID_ARG_TYPE';
            return rejects(
              willReject(te),
              new TypeError('Wrong type')
            ).then(function (nothing) {
              assert(nothing === undefined);
            }, shouldNotBeRejected);
          });
          it('when some of the properties are not same, rejects with AssertionError.', function () {
            var otherErr = new RangeError('Not found');
            otherErr.code = 404;
            return rejects(
              willReject(otherErr),
              new TypeError('Wrong type')
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert(err.actual === otherErr);
            });
          });
          it('appends `error.name` as expected error class name to the message if the `promiseFn` is not rejected.', function () {
            return rejects(
              willResolve('GOOD!'),
              new TypeError('Wrong type')
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert.equal(err.message, 'Missing expected rejection (TypeError).');
            });
          });
        });
        describe('note that `error` cannot be a string.', function () {
          describe('if a string is provided as the second argument,', function () {
            it('and the third argument is not given, then `error` is assumed to be omitted and the string will be used for `message` instead. This can lead to easy-to-miss mistakes.', function () {
              return rejects(
                willResolve('GOOD!'),
                'This can lead to easy-to-miss mistakes.'
              ).then(shouldNotBeFulfilled, function (err) {
                assert(err instanceof assert.AssertionError);
                assert.equal(err.message, 'Missing expected rejection: This can lead to easy-to-miss mistakes.');
              });
            });
            it('and the third argument is also given, reject TypeError with code `ERR_INVALID_ARG_TYPE`.', function () {
              return rejects(
                willResolve('GOOD!'),
                'This can lead to easy-to-miss mistakes.',
                'This is clearly a mistake.'
              ).then(shouldNotBeFulfilled, function (err) {
                assert(err instanceof TypeError);
                if (impl.name === 'official implementation' && semver.satisfies(process.version, '< 12.0.0')) {
                  assert.equal(err.message, 'The "error" argument must be one of type Object, Error, Function, or RegExp. Received type string');
                } else {
                  assert(err.message.startsWith('The "error" argument must be of type function or an instance of Error, RegExp, or Object. Received type string'), `actual [${err.message}]`);
                }
              });
            });
            it('and is identical to the message property of actual error, reject TypeError with code `ERR_AMBIGUOUS_ARGUMENT`.', function () {
              return rejects(
                willReject(new TypeError('Wrong type')),
                'Wrong type'
              ).then(shouldNotBeFulfilled, function (err) {
                assert(err instanceof TypeError);
                assert(err.code === 'ERR_AMBIGUOUS_ARGUMENT');
                assert.equal(err.message, 'The "error/message" argument is ambiguous. The error message "Wrong type" is identical to the message.');
              });
            });
            it('and is identical to the actual rejected object, reject TypeError with code `ERR_AMBIGUOUS_ARGUMENT`.', function () {
              return rejects(
                willReject('Rejection Reason'),
                'Rejection Reason'
              ).then(shouldNotBeFulfilled, function (err) {
                assert(err instanceof TypeError);
                assert(err.code === 'ERR_AMBIGUOUS_ARGUMENT');
                assert.equal(err.message, 'The "error/message" argument is ambiguous. The error "Rejection Reason" is identical to the message.');
              });
            });
          });
        });
      });
      describe('message `<any>`', function () {
        describe('if specified, `message` will be the message provided by the AssertionError if the `promiseFn` fails to reject.', function () {
          it('when `error` is one of `<Class>`, `<Error>` or `<Object>` with `name` property, append it as expected error class name to the assertion message.', function () {
            return rejects(
              willResolve('GOOD!'),
              TypeError,
              'MUST BE REJECTED but resolved'
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert.equal(err.message, 'Missing expected rejection (TypeError): MUST BE REJECTED but resolved');
            });
          });
          it('assertion message without expected error class name (when `error` is RegExp or Fuction)', function () {
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
        describe('`message` argument is also used with `error` of type `<Object>` or `<Error>`', function () {
          it('when `error` is an `<Object>` and comparison fails, rejects AssertionError with specified failure message', function () {
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
          it('when `error` is an `<Error>` and comparison fails, rejects AssertionError with specified failure message', function () {
            var e = new RangeError('Wrong range');
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
        it('`message` argument accepts <any>', function () {
          return rejects(
            willResolve('GOOD!'),
            null,
            1234
          ).then(shouldNotBeFulfilled, function (err) {
            assert(err instanceof assert.AssertionError);
            assert.equal(err.message, 'Missing expected rejection: 1234');
          });
        });
      });
      describe('edge cases', function () {
        it('when `error` is null, works as if `promiseFn` and `message` are given', function () {
          return rejects(
            willResolve('GOOD!'),
            null,
            'MUST BE REJECTED but resolved'
          ).then(shouldNotBeFulfilled, function (err) {
            assert(err instanceof assert.AssertionError);
            assert.equal(err.message, 'Missing expected rejection: MUST BE REJECTED but resolved');
          });
        });
        it('when `error` is null and `message` is also null, works as if only `promiseFn` is given', function () {
          return rejects(
            willResolve('GOOD!'),
            null,
            null
          ).then(shouldNotBeFulfilled, function (err) {
            assert(err instanceof assert.AssertionError);
            assert.equal(err.message, 'Missing expected rejection.');
          });
        });
      });
    });

    describe('#doesNotReject(promiseFn, [error], [message])', function () {
      describe('promiseFn `<Function> | <Promise>`', function () {
        describe('if `promiseFn` is a `<Promise>`, awaits the promise then check that the promise is NOT rejected.', function () {
          it('rejects with AssertionError if the `promiseFn` is rejected.', function () {
            var te = new TypeError('Wrong type');
            return doesNotReject(
              willReject(te)
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert(err.actual === te);
              assert.equal(err.message, 'Got unwanted rejection.\nActual message: "Wrong type"');
            });
          });
          it('resolves if the `promiseFn` is not rejected.', function () {
            return doesNotReject(willResolve('GOOD!')).then(function () {
              assert(true);
            }, shouldNotBeRejected);
          });
        });
        describe('if `promiseFn` is a `<Function>`, immediately calls the function and awaits the returned promise to complete. It will then check that the promise is NOT rejected.', function () {
          it('rejects with AssertionError if the promise returned from `promiseFn` is rejected.', function () {
            var te = new TypeError('Wrong type');
            return doesNotReject(function () {
              return willReject(te);
            }).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert(err.actual === te);
              assert.equal(err.message, 'Got unwanted rejection.\nActual message: "Wrong type"');
            });
          });
          it('resolves if the promise returned from `promiseFn` is not rejected.', function () {
            return doesNotReject(function () {
              return willResolve('GOOD!');
            }).then(function () {
              assert(true);
            }, shouldNotBeRejected);
          });
          it('if `promiseFn` is a function and it throws an error synchronously, `doesNotReject()` will return a rejected Promise with that error.', function () {
            return doesNotReject(function () {
              throw new RangeError('synchronous range error');
            }).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof RangeError);
              assert(err.message === 'synchronous range error');
            });
          });
          it('if the function does not return a promise, `doesNotReject()` will return a rejected Promise with an `ERR_INVALID_RETURN_VALUE` TypeError.', function () {
            return doesNotReject(function () {
              return 'not a Promise';
            }).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof TypeError);
              assert(err.code === 'ERR_INVALID_RETURN_VALUE');
              assert.equal(err.message, 'Expected instance of Promise to be returned from the "promiseFn" function but got instance of String.');
            });
          });
        });
        describe('if type of `promiseFn` is other than `<Promise>` or `<Function>`, `doesNotReject()` will return a rejected Promise with an `ERR_INVALID_ARG_TYPE` TypeError.', function () {
          it('string', function () {
            return doesNotReject('not a promise or function').then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof TypeError);
              assert(err.code === 'ERR_INVALID_ARG_TYPE');
                if (impl.name === 'official implementation' && semver.satisfies(process.version, '< 12.0.0')) {
                  assert.equal(err.message, 'The "promiseFn" argument must be one of type Function or Promise. Received type string');
                } else {
                  assert(err.message.startsWith('The "promiseFn" argument must be of type function or an instance of Promise. Received type string'), `actual [${err.message}]`);
                }
            });
          });
          it('number', function () {
            return doesNotReject(9999).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof TypeError);
              assert(err.code === 'ERR_INVALID_ARG_TYPE');
              if (impl.name === 'official implementation' && semver.satisfies(process.version, '< 12.0.0')) {
                assert.equal(err.message, 'The "promiseFn" argument must be one of type Function or Promise. Received type number');
              } else {
                assert(err.message.startsWith('The "promiseFn" argument must be of type function or an instance of Promise. Received type number'), `actual [${err.message}]`);
              }
            });
          });
          it('null', function () {
            return doesNotReject(null).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof TypeError);
              assert(err.code === 'ERR_INVALID_ARG_TYPE');
              if (impl.name === 'official implementation' && semver.satisfies(process.version, '< 12.0.0')) {
                assert.equal(err.message, 'The "promiseFn" argument must be one of type Function or Promise. Received type object');
              } else {
                assert(err.message.startsWith('The "promiseFn" argument must be of type function or an instance of Promise. Received null'), `actual [${err.message}]`);
              }
            });
          });
        });
      });
      describe('error `<RegExp> | <Class> | <Function>`', function () {
        describe('if `error` is a `<RegExp>`, validate rejected error message using RegExp. Using a regular expression runs `.toString()` on the error object, and will therefore also include the error name.', function () {
          it('when message matches, rejects with AssertionError.', function () {
            var e = new RangeError('Should not happen');
            return doesNotReject(
              willReject(e),
              /^RangeError: Should not happen$/
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert(err.actual === e);
              assert.equal(err.message, 'Got unwanted rejection.\nActual message: "Should not happen"');
            });
          });
          it('when message does not match, rejects with actual error.', function () {
            var e = new TypeError('Another Error');
            return doesNotReject(
              willReject(e),
              /^Error: Should not happen$/
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof TypeError);
              assert(err === e);
              assert.equal(err.message, 'Another Error');
            });
          });
        });
        describe('if `error` is a `<Class>` (constructor function), validate instanceof using constructor (works well with ES2015 classes that extends Error).', function () {
          it('when rejected error is an instanceof `<Class>`, rejects with AssertionError.', function () {
            var e = new TypeError('Wrong type');
            return doesNotReject(
              willReject(e),
              Error
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert(err.actual === e);
              assert.equal(err.message, 'Got unwanted rejection.\nActual message: "Wrong type"');
            });
          });
          it('when rejected error is NOT an instanceof `<Class>`, rejects with the actual error.', function () {
            var e = new RangeError('Wrong range');
            return doesNotReject(
              willReject(e),
              TypeError
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof RangeError);
              assert.equal(err.message, 'Wrong range');
            });
          });
          describe('works well with ES2015 class that extends Error', function () {
            class ES2015Error extends Error {
            }
            class AnotherES2015Error extends Error {
            }
            it('match case, rejects with AssertionError.', function () {
              var e = new ES2015Error('foo');
              return doesNotReject(
                willReject(e),
                ES2015Error
              ).then(shouldNotBeFulfilled, function (err) {
                assert(err instanceof assert.AssertionError);
                assert(err.actual === e);
                assert.equal(err.message, 'Got unwanted rejection.\nActual message: "foo"');
              });
            });
            it('unmatch case, rejects with the original error.', function () {
              return doesNotReject(
                willReject(new AnotherES2015Error('bar')),
                ES2015Error
              ).then(shouldNotBeFulfilled, function (err) {
                assert(err instanceof AnotherES2015Error);
                assert.equal(err.message, 'bar');
              });
            });
          });
        });
        describe('if `error` is a `<Function>`, run custom validation against rejection result.', function () {
          it('when validation function returns `true`, rejects with AssertionError.', function () {
            var e = new RangeError('Wrong range');
            return doesNotReject(
              willReject(e),
              function (err) {
                return ((err instanceof RangeError) && /range/.test(err));
              }
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert(err.actual === e);
              assert.equal(err.message, 'Got unwanted rejection.\nActual message: "Wrong range"');
            });
          });
          it('when returned value of validation function is NOT `true`, rejects with the actual error.', function () {
            var e = new RangeError('Wrong range');
            return doesNotReject(
              willReject(e),
              function (err) {
                return ((err instanceof TypeError) && /type/.test(err));
              }
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof RangeError);
              assert(err === e);
              assert.equal(err.message, 'Wrong range');
            });
          });
          it('if Error is thrown from validation function, rejects with the error.', function () {
            var e = new RangeError('Wrong range');
            var te = new TypeError('some programming error');
            return doesNotReject(
              willReject(e),
              function () {
                throw te;
              }
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof TypeError);
              assert(err === te);
              assert.equal(err.message, 'some programming error');
            });
          });
          it('validation function can be an arrow function.', function () {
            var e = new RangeError('Wrong range');
            return doesNotReject(
              willReject(e),
              (err) => ((err instanceof RangeError) && /range/.test(err))
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof assert.AssertionError);
              assert(err.actual === e);
              assert.equal(err.message, 'Got unwanted rejection.\nActual message: "Wrong range"');
            });
          });
        });
        describe('note that `error` cannot be a string.', function () {
          describe('if a string is provided as the second argument,', function () {
            it('and the third argument is not given, then `error` is assumed to be omitted and the string will be used for `message` instead. This can lead to easy-to-miss mistakes.', function () {
              var e = new TypeError('Wrong type');
              return doesNotReject(
                willReject(e),
                'This can lead to easy-to-miss mistakes.'
              ).then(shouldNotBeFulfilled, function (err) {
                assert(err instanceof assert.AssertionError);
                assert(err.actual === e);
                assert.equal(err.message, 'Got unwanted rejection: This can lead to easy-to-miss mistakes.\nActual message: "Wrong type"');
              });
            });
            it('and the third argument is also given, third argument is just ignored.', function () {
              var e = new TypeError('Wrong type');
              return doesNotReject(
                willReject(e),
                'This can lead to easy-to-miss mistakes.',
                'This is clearly a mistake.'
              ).then(shouldNotBeFulfilled, function (err) {
                assert(err instanceof assert.AssertionError);
                assert(err.actual === e);
                assert.equal(err.message, 'Got unwanted rejection: This can lead to easy-to-miss mistakes.\nActual message: "Wrong type"');
              });
            });
          });
        });
        describe('if type of `error` is other than `<RegExp>` or `<Function>` (including `<Class>`)', function () {
          it('number', function () {
            return doesNotReject(
              willReject(new RangeError('Wrong range')),
              9999
            ).then(shouldNotBeFulfilled, function (err) {
              assert(err instanceof TypeError);
              assert(err.code === 'ERR_INVALID_ARG_TYPE');
              if (impl.name === 'official implementation' && semver.satisfies(process.version, '< 12.0.0')) {
                assert.equal(err.message, 'The "expected" argument must be one of type Function or RegExp. Received type number');
              } else {
                assert(err.message.startsWith('The "expected" argument must be of type function or an instance of RegExp. Received type number'), `actual [${err.message}]`);
              }
            });
          });
        });
      });
      describe('message `<any>`', function () {
        it('if an AssertionError is thrown and a value is provided for the message parameter, the value of message will be appended to the AssertionError message.', function () {
          var e = new TypeError('Wrong type');
          return doesNotReject(
            willReject(e),
            TypeError,
            'should not be thrown'
          ).then(shouldNotBeFulfilled, function (err) {
            assert(err instanceof assert.AssertionError);
            assert(err.actual === e);
            assert.equal(err.message, 'Got unwanted rejection: should not be thrown\nActual message: "Wrong type"');
          });
        });
      });
    });
  });
});
