function doesNotReject () {
}

function rejects (block, error, message) {
    try {
        block();
    } catch(e) {
        return Promise.reject(e);
    }
}

doesNotReject.rejects = rejects;
module.exports = doesNotReject;
