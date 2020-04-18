/**
 * rejected-or-not
 *   Promise-based implementation of Node v10's `assert.rejects()` and `assert.doesNotReject()` for old Nodes and browsers.
 *
 * https://github.com/twada/rejected-or-not
 *
 * Copyright (c) 2018-2020 Takuto Wada
 * Licensed under the MIT license.
 *   https://github.com/twada/rejected-or-not/blob/master/LICENSE
 */
'use strict';

var AssertionError = require('assert').AssertionError;
var deepStrictEqual = require('universal-deep-strict-equal');
var slice = Array.prototype.slice;

function rejects (promiseFn, error, message) {
  if (!(typeof promiseFn === 'function' || isPromiseLike(promiseFn))) {
    return rejectWithInvalidArgType('promiseFn', 'function or an instance of Promise', promiseFn);
  }
  if (typeof error === 'string' && arguments.length === 3) {
    return rejectWithInvalidArgType('error', 'function or an instance of Error, RegExp, or Object', error);
  }
  if (isPromiseLike(promiseFn)) {
    return wantReject(rejects, promiseFn, error, message);
  }
  var ret = promiseFn();
  if (isPromiseLike(ret)) {
    return wantReject(rejects, ret, error, message);
  } else {
    return rejectWithInvalidReturnValue('promiseFn', ret);
  }
}

function doesNotReject (promiseFn, error, message) {
  if (!(typeof promiseFn === 'function' || isPromiseLike(promiseFn))) {
    return rejectWithInvalidArgType('promiseFn', 'function or an instance of Promise', promiseFn);
  }
  if (typeof error === 'string') {
    message = error;
    error = undefined;
  }
  if (isPromiseLike(promiseFn)) {
    return doesNotWantReject(doesNotReject, promiseFn, error, message);
  }
  var ret = promiseFn();
  if (isPromiseLike(ret)) {
    return doesNotWantReject(doesNotReject, ret, error, message);
  } else {
    return rejectWithInvalidReturnValue('promiseFn', ret);
  }
}

function wantReject (stackStartFn, thennable, errorHandler, message) {
  return new Promise(function (resolve, reject) {
    var onFulfilled = ensureSettled(reject, function () {
      // If a string is provided as the second argument, then error is assumed to be omitted and the string will be used for message instead.
      if (typeof errorHandler === 'string' && typeof message === 'undefined') {
        message = errorHandler;
        errorHandler = undefined;
      }
      return reject(createMissingRejectionError(stackStartFn, errorHandler, message));
    });
    var onRejected = ensureSettled(reject, function (actualRejectionResult) {
      if (!errorHandler) {
        return resolve();
      }
      if (typeof errorHandler === 'string') {
        if (typeof actualRejectionResult === 'object' && actualRejectionResult !== null) {
          if (actualRejectionResult.message === errorHandler) {
            return reject(createAmbiguousArgumentError('message "' + errorHandler + '"'));
          }
        } else if (actualRejectionResult === errorHandler) {
          return reject(createAmbiguousArgumentError('"' + errorHandler + '"'));
        }
      }
      if (errorHandler instanceof RegExp) {
        if (errorHandler.test(actualRejectionResult)) {
          return resolve();
        } else {
          return reject(new AssertionError({
            actual: actualRejectionResult,
            expected: errorHandler,
            message: message || 'The input did not match the regular expression ' + errorHandler + '. Input:\n\n\'' + actualRejectionResult + '\'\n',
            operator: stackStartFn.name,
            stackStartFn: stackStartFn
          }));
        }
      }
      if (typeof errorHandler === 'function') {
        // ensureSettled instanceof against arrow functions as they don't have a prototype.
        if (errorHandler.prototype !== undefined) {
          if (actualRejectionResult instanceof errorHandler) {
            return resolve();
          } else if (Error.isPrototypeOf(errorHandler)) {
            // Dealing with ES2015 class that extends Error
            // see: https://github.com/nodejs/node/issues/3188
            // see: https://github.com/nodejs/node/pull/4166
            return reject(new AssertionError({
              actual: actualRejectionResult,
              expected: errorHandler,
              message: message || 'The error is expected to be an instance of "' + errorHandler.name + '". Received "' + actualRejectionResult.constructor.name + '"\n\nError message:\n\n' + actualRejectionResult.message,
              operator: stackStartFn.name,
              stackStartFn: stackStartFn
            }));
          }
        }
        var handlerFuncResult = errorHandler.call({}, actualRejectionResult);
        if (handlerFuncResult === true) {
          return resolve();
        } else {
          var validationFunctionName = errorHandler.name ? 'The "' + errorHandler.name + '" validation function' : 'The validation function';
          return reject(new AssertionError({
            actual: actualRejectionResult,
            expected: errorHandler,
            message: message || validationFunctionName + ' is expected to return "true". Received ' + handlerFuncResult + '\n\nCaught error:\n\n' + actualRejectionResult,
            operator: stackStartFn.name,
            stackStartFn: stackStartFn
          }));
        }
      }
      if (typeof errorHandler === 'object') {
        var expectedKeys = Object.keys(errorHandler);
        if (errorHandler instanceof Error) {
          // an instance of error where each property will be tested for including the non-enumerable message and name properties
          expectedKeys.push('name', 'message');
        }
        var differs = expectedKeys.some(function (key) {
          return !(key in actualRejectionResult) ||
            !deepStrictEqual(actualRejectionResult[key], errorHandler[key]);
        });
        if (differs) {
          return reject(new AssertionError({
            actual: actualRejectionResult,
            expected: errorHandler,
            message: message || createComparisonMessage(actualRejectionResult, errorHandler, expectedKeys, stackStartFn),
            operator: stackStartFn.name,
            stackStartFn: stackStartFn
          }));
        } else {
          return resolve();
        }
      }
      return reject(actualRejectionResult);
    });
    thennable.then(onFulfilled, onRejected);
  });
}

function doesNotWantReject (stackStartFn, thennable, errorHandler, message) {
  return new Promise(function (resolve, reject) {
    var onFulfilled = ensureSettled(reject, function () {
      return resolve();
    });
    var onRejected = ensureSettled(reject, function (actualRejectionResult) {
      if (!errorHandler) {
        return reject(createUnwantedRejectionError(stackStartFn, actualRejectionResult, errorHandler, message));
      }
      if (errorHandler instanceof RegExp) {
        if (errorHandler.test(actualRejectionResult)) {
          return reject(createUnwantedRejectionError(stackStartFn, actualRejectionResult, errorHandler, message));
        } else {
          return reject(actualRejectionResult);
        }
      } else if (typeof errorHandler === 'function') {
        if (errorHandler.prototype !== undefined) {
          if (actualRejectionResult instanceof errorHandler) {
            return reject(createUnwantedRejectionError(stackStartFn, actualRejectionResult, errorHandler, message));
          } else if (Error.isPrototypeOf(errorHandler)) {
            return reject(actualRejectionResult);
          }
        }
        if (errorHandler.call({}, actualRejectionResult) === true) {
          return reject(createUnwantedRejectionError(stackStartFn, actualRejectionResult, errorHandler, message));
        } else {
          return reject(actualRejectionResult);
        }
      } else {
        return reject(createInvalidArgTypeError('expected', 'function or an instance of RegExp', errorHandler));
      }
    });
    thennable.then(onFulfilled, onRejected);
  });
}

function createMissingRejectionError (stackStartFn, expected, message) {
  var failureMessage = 'Missing expected rejection';
  if (expected && expected.name) {
    failureMessage += ' (' + expected.name + ')';
  }
  failureMessage += message ? ': ' + message : '.';
  return new AssertionError({
    actual: undefined,
    expected: expected,
    operator: stackStartFn.name,
    message: failureMessage,
    stackStartFn: stackStartFn
  });
}

function createUnwantedRejectionError (stackStartFn, actual, expected, message) {
  var actualMessage = actual && actual.message;
  var failureMessage = 'Got unwanted rejection';
  failureMessage += message ? ': ' + message : '.';
  failureMessage += '\nActual message: "' + actualMessage + '"';
  return new AssertionError({
    actual: actual,
    expected: expected,
    operator: stackStartFn.name,
    message: failureMessage,
    stackStartFn: stackStartFn
  });
}

function createAmbiguousArgumentError (msg) {
  var te = new TypeError('The "error/message" argument is ambiguous. The error ' + msg + ' is identical to the message.');
  te.code = 'ERR_AMBIGUOUS_ARGUMENT';
  return te;
}

function createInvalidArgTypeError (argName, typeNames, actualArg) {
  var actualArgDesc = actualArg === null ? 'null' : 'type ' + typeof actualArg;
  var te = new TypeError('The "' + argName + '" argument must be of type ' + typeNames + '. Received ' + actualArgDesc);
  te.code = 'ERR_INVALID_ARG_TYPE';
  return te;
}

function createInvalidReturnValueError (fnName, ret) {
  var wrongType;
  if (ret && ret.constructor && ret.constructor.name) {
    wrongType = 'instance of ' + ret.constructor.name;
  } else {
    wrongType = 'type ' + typeof ret;
  }
  var te = new TypeError('Expected instance of Promise to be returned from the "' + fnName + '" function but got ' + wrongType + '.');
  te.code = 'ERR_INVALID_RETURN_VALUE';
  return te;
}

function rejectWithInvalidArgType (argName, typeNames, actualArg) {
  return Promise.reject(createInvalidArgTypeError(argName, typeNames, actualArg));
}

function rejectWithInvalidReturnValue (fnName, ret) {
  return Promise.reject(createInvalidReturnValueError(fnName, ret));
}

function comparison (obj, keys) {
  var dest = {};
  keys.forEach(function (key) {
    if (key in obj) {
      dest[key] = obj[key];
    }
  });
  return dest;
}

function createComparisonMessage (actual, expected, keys, stackStartFn) {
  var a = comparison(actual, keys);
  var b = comparison(expected, keys);
  var tmpLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 0;
  var err = new AssertionError({
    actual: a,
    expected: b,
    operator: 'deepStrictEqual',
    stackStartFn: stackStartFn
  });
  Error.stackTraceLimit = tmpLimit;
  return err.message;
}

function isPromiseLike (obj) {
  return obj !== null &&
    typeof obj === 'object' &&
    typeof obj.then === 'function' &&
    typeof obj.catch === 'function';
}

function ensureSettled (reject, promiseFn) {
  return function () {
    try {
      return promiseFn.apply(null, slice.call(arguments));
    } catch (e) {
      return reject(e);
    }
  };
}

module.exports = {
  rejects: ensureSettled(function (e) { return Promise.reject(e); }, rejects),
  doesNotReject: ensureSettled(function (e) { return Promise.reject(e); }, doesNotReject)
};
