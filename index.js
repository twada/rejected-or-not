function doesNotReject () {
}

function rejects (block, error, message) {
  if (isPromiseLike(block)) {
    return new Promise((resolve, reject) => {
      block.then(reject, resolve);
    });
  }
  try {
    var ret = block();
    if (isPromiseLike(ret)) {
      return new Promise((resolve, reject) => {
        ret.then(reject, resolve);
      });
    } else {
      var newError = new TypeError('function does not return a promise');
      newError.code = 'ERR_INVALID_RETURN_VALUE';
      return Promise.reject(newError);
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

function isPromiseLike (obj) {
  return obj !== null &&
    typeof obj === 'object' &&
    typeof obj.then === 'function' &&
    typeof obj.catch === 'function';
}

doesNotReject.rejects = rejects;
module.exports = doesNotReject;
