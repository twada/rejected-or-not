var AssertionError = require('assert').AssertionError;

function doesNotReject () {
}

function rejects (block, error, message) {
  if (!(typeof block === 'function' || isPromiseLike(block))) {
    var te = new TypeError('The "block" argument must be one of type Function or Promise. Received type ' + typeof block);
    te.code = 'ERR_INVALID_ARG_TYPE';
    return Promise.reject(te);
  }
  if (isPromiseLike(block)) {
    return wantReject(block, rejects, error);
  }
  try {
    var ret = block();
    if (isPromiseLike(ret)) {
      return wantReject(ret, rejects, error);
    } else {
      var newError = new TypeError('function does not return a promise');
      newError.code = 'ERR_INVALID_RETURN_VALUE';
      return Promise.reject(newError);
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

function wantReject (thennable, stackStartFn, error) {
  return new Promise((resolve, reject) => {
    thennable.then(function () {
      return reject(new AssertionError({
        actual: undefined,
        expected: error,
        operator: stackStartFn.name,
        message: 'Missing expected rejection.',
        stackStartFn: stackStartFn
      }));
    }, resolve);
  });
}

function isPromiseLike (obj) {
  return obj !== null &&
    typeof obj === 'object' &&
    typeof obj.then === 'function' &&
    typeof obj.catch === 'function';
}

doesNotReject.rejects = rejects;
module.exports = doesNotReject;
