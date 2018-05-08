var AssertionError = require('assert').AssertionError;
var deepStrictEqual = require('universal-deep-strict-equal');

function doesNotReject (block, error, message) {
  if (!(typeof block === 'function' || isPromiseLike(block))) {
    return rejectWithInvalidArgType('block', 'Function or Promise', block);
  }
  if (isPromiseLike(block)) {
    return doesNotWantReject(doesNotReject, block, error, message);
  }
  try {
    var ret = block();
    if (isPromiseLike(ret)) {
      return doesNotWantReject(doesNotReject, ret, error, message);
    } else {
      return rejectWithInvalidReturnValue('block', ret);
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

function doesNotWantReject (stackStartFn, thennable, errorHandler, message) {
  return new Promise(function (resolve, reject) {
    var onFulfilled = guard(reject, function () {
      return resolve();
    });
    var onRejected = guard(reject, function (actualRejectionResult) {
      if (!errorHandler) {
        return reject(unwantedRejectionError(stackStartFn, actualRejectionResult, errorHandler, message));
      }
      if (errorHandler instanceof RegExp) {
        if (errorHandler.test(actualRejectionResult)) {
          return reject(unwantedRejectionError(stackStartFn, actualRejectionResult, errorHandler, message));
        } else {
          return reject(actualRejectionResult);
        }
      } else if (typeof errorHandler === 'function') {
        if (errorHandler.prototype !== undefined) {
          if (actualRejectionResult instanceof errorHandler) {
            return reject(unwantedRejectionError(stackStartFn, actualRejectionResult, errorHandler, message));
          } else if (Error.isPrototypeOf(errorHandler)) {
            return reject(actualRejectionResult);
          }
        }
        if (errorHandler.call({}, actualRejectionResult) === true) {
          return reject(unwantedRejectionError(stackStartFn, actualRejectionResult, errorHandler, message));
        } else {
          return reject(actualRejectionResult);
        }
      } else {
        return reject(createInvalidArgTypeError('expected', 'Function or RegExp', errorHandler));
      }
    });
    thennable.then(onFulfilled, onRejected);
  });
}

function unwantedRejectionError (stackStartFn, actual, expected, message) {
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

function rejects (block, error, message) {
  if (!(typeof block === 'function' || isPromiseLike(block))) {
    return rejectWithInvalidArgType('block', 'Function or Promise', block);
  }
  if (typeof error === 'string' && arguments.length === 3) {
    return rejectWithInvalidArgType('error', 'Object, Error, Function, or RegExp', error);
  }
  if (isPromiseLike(block)) {
    return wantReject(rejects, block, error, message);
  }
  try {
    var ret = block();
    if (isPromiseLike(ret)) {
      return wantReject(rejects, ret, error, message);
    } else {
      return rejectWithInvalidReturnValue('block', ret);
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

function wantReject (stackStartFn, thennable, errorHandler, message) {
  return new Promise(function (resolve, reject) {
    var onFulfilled = guard(reject, function () {
      // If a string is provided as the second argument, then error is assumed to be omitted and the string will be used for message instead.
      if (typeof errorHandler === 'string' && typeof message === 'undefined') {
        message = errorHandler;
        errorHandler = undefined;
      }
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
    });
    var onRejected = guard(reject, function (actualRejectionResult) {
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
          return reject(actualRejectionResult);
        }
      }
      if (typeof errorHandler === 'function') {
        // Guard instanceof against arrow functions as they don't have a prototype.
        if (errorHandler.prototype !== undefined) {
          if (actualRejectionResult instanceof errorHandler) {
            return resolve();
          } else if (Error.isPrototypeOf(errorHandler)) {
            // Dealing with ES2015 class that extends Error
            // see: https://github.com/nodejs/node/issues/3188
            // see: https://github.com/nodejs/node/pull/4166
            return reject(actualRejectionResult);
          }
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
    thennable.then(onFulfilled, onRejected);
  });
}

function guard (reject, block) {
  return function (arg) {
    try {
      return block(arg);
    } catch (e) {
      return reject(e);
    }
  };
}

function isPromiseLike (obj) {
  return obj !== null &&
    typeof obj === 'object' &&
    typeof obj.then === 'function' &&
    typeof obj.catch === 'function';
}

function createAmbiguousArgumentError (msg) {
  var te = new TypeError('The "error/message" argument is ambiguous. The error ' + msg + ' is identical to the message.');
  te.code = 'ERR_AMBIGUOUS_ARGUMENT';
  return te;
}

function createInvalidArgTypeError (argName, typeNames, actualArg) {
  var te = new TypeError('The "' + argName + '" argument must be one of type ' + typeNames + '. Received type ' + typeof actualArg);
  te.code = 'ERR_INVALID_ARG_TYPE';
  return te;
}

function rejectWithInvalidArgType (argName, typeNames, actualArg) {
  return Promise.reject(createInvalidArgTypeError(argName, typeNames, actualArg));
}

function rejectWithInvalidReturnValue (fnName, ret) {
  var wrongType;
  if (ret && ret.constructor && ret.constructor.name) {
    wrongType = 'instance of ' + ret.constructor.name;
  } else {
    wrongType = 'type ' + typeof ret;
  }
  var e = new TypeError('Expected instance of Promise to be returned from the "' + fnName + '" function but got ' + wrongType + '.');
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

module.exports = {
  rejects: rejects,
  doesNotReject: doesNotReject
};
