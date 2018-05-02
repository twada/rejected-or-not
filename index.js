var AssertionError = require('assert').AssertionError;
var deepStrictEqual = require('universal-deep-strict-equal');

function doesNotReject () {
}

function rejects (block, error, message) {
  if (!(typeof block === 'function' || isPromiseLike(block))) {
    var te = new TypeError('The "block" argument must be one of type Function or Promise. Received type ' + typeof block);
    te.code = 'ERR_INVALID_ARG_TYPE';
    return Promise.reject(te);
  }
  if (isPromiseLike(block)) {
    return wantReject(rejects, block, error, message);
  }
  try {
    var ret = block();
    if (isPromiseLike(ret)) {
      return wantReject(rejects, ret, error, message);
    } else {
      return notReturningPromise(ret);
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

function wantReject (stackStartFn, thennable, errorHandler, message) {
  return new Promise(function (resolve, reject) {
    thennable.then(function () {
      var failureMessage = 'Missing expected rejection';
      if (errorHandler && errorHandler.name) {
        failureMessage += ' (' + errorHandler.name + ')';
      }
      failureMessage += message ? ': ' + message : '.';
      return reject(new AssertionError({
        actual: undefined,
        expected: errorHandler,
        operator: stackStartFn.name,
        message: failureMessage,
        stackStartFn: stackStartFn
      }));
    }, function (actualRejectionResult) {
      if (!errorHandler) {
        return resolve();
      }
      if (errorHandler instanceof RegExp) {
        if (errorHandler.test(actualRejectionResult)) {
          return resolve();
        } else {
          return reject(actualRejectionResult);
        }
      }
      if (typeof errorHandler === 'function') {
        if (errorHandler.prototype !== undefined && actualRejectionResult instanceof errorHandler) {
          return resolve();
        }
        if (Error.isPrototypeOf(errorHandler)) {
          return reject(actualRejectionResult);
        }
        if (errorHandler.call({}, actualRejectionResult) === true) {
          return resolve();
        } else {
          return reject(actualRejectionResult);
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
  });
}

function isPromiseLike (obj) {
  return obj !== null &&
    typeof obj === 'object' &&
    typeof obj.then === 'function' &&
    typeof obj.catch === 'function';
}

function notReturningPromise (ret) {
  var wrongType;
  if (ret && ret.constructor && ret.constructor.name) {
    wrongType = 'instance of ' + ret.constructor.name;
  } else {
    wrongType = 'type ' + typeof ret;
  }
  var e = new TypeError('Expected instance of Promise to be returned from the "block" function but got ' + wrongType + '.');
  e.code = 'ERR_INVALID_RETURN_VALUE';
  return Promise.reject(e);
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

doesNotReject.rejects = rejects;
module.exports = doesNotReject;
