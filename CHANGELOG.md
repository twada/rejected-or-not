## [2.0.0](https://github.com/twada/rejected-or-not/releases/tag/v2.0.0) (2020-04-19)


#### Features

* [Sync with behavior changes in Node13](https://github.com/twada/rejected-or-not/pull/4)


#### Breaking Changes

* If the validation function passed to `assert.rejects()` returns a value other than true, an assertion error will be thrown instead of the original error. ([6624cc1f](https://github.com/twada/rejected-or-not/commit/6624cc1f815543efc4d38b6c8f8439f83589c58e))
* If a constructor function is passed to validate the instance of errors thrown in `assert.reject()`, an assertion error will be thrown instead of the original error. ([aa73271b](https://github.com/twada/rejected-or-not/commit/aa73271b87f6861544d102f2572ece649cdd0c7b))


## [1.1.0](https://github.com/twada/rejected-or-not/releases/tag/v1.1.0) (2020-04-18)


#### Features

* [Sync with improvement of regex validation introduced in Node 12.5.0](https://github.com/twada/rejected-or-not/pull/1)
* [Sync with upstream changes in ERR_INVALID_ARG_TYPE message](https://github.com/twada/rejected-or-not/pull/3)


### [1.0.1](https://github.com/twada/rejected-or-not/releases/tag/v1.0.1) (2018-10-05)


#### Chore

  * rename `block` to `promiseFn` ([7843c1f4](https://github.com/twada/rejected-or-not/commit/7843c1f4d12d9932d5ad9a2620c547bf290d001b), [4ba08c71](https://github.com/twada/rejected-or-not/commit/4ba08c71761686073aa457a9bddb1a49a1c150d9))


## [1.0.0](https://github.com/twada/rejected-or-not/releases/tag/v1.0.0) (2018-05-11)


#### Features

  * the first stable release


## [0.1.0](https://github.com/twada/rejected-or-not/releases/tag/v0.1.0) (2018-05-09)


#### Features

  * initial release
