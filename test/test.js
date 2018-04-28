delete require.cache[require.resolve('..')];
var doesNotReject = require('..');
var rejects = doesNotReject.rejects;
var assert = require('assert');

function shouldNotBeHere (args) {
  assert(false, 'should not be here: ' + args);
}

describe('#rejects', function () {
    it('If block is a function and it throws an error synchronously, assert.rejects() will return a rejected Promise with that error.', function () {
        return rejects(function () {
            throw new Error('synchronous error');
        }).then(shouldNotBeHere, function (err) {
            assert(err instanceof Error);
            assert(err.message === 'synchronous error');
        });
    });
});
