![build](https://github.com/gsvarovsky/rx-flowable/actions/workflows/node.js.yml/badge.svg)
![npm](https://img.shields.io/npm/v/rx-flowable)
![stability-wip](https://img.shields.io/badge/stability-work_in_progress-lightgrey.svg)

# rx-flowable

_observables with lossless back-pressure_

[RxJS](https://rxjs.dev/) is a library for reactive programming using Observables, to make it easier to compose asynchronous or callback-based code.
 
**rx-flowable** makes it possible to _back-pressure_ observables in RxJS 7. This is useful when an observable produces values faster than a subscriber can consume them.

Please consider that a number of solutions for lossless back-pressured streaming of values already exist for the Javascript platform, as listed in the bibliography below. This module is designed for projects that already make extensive use of RxJS, and prefer not to adopt another library, with the associated knowledge overhead.

> ⚠️ Use of this library requires a solid understanding of RxJS, especially when authoring observable pipelines. This is because native RxJS operators are not designed for back-pressure and may behave unexpectedly if used naively.

**[Feedback](https://github.com/gsvarovsky/rx-flowable/issues) and contributions welcome!**

## principle

The basic building block of **rx-flowable** is an Observable of Bites, called a [Consumable](src/index.ts). A bite is an object containing:
- a `value`
- a function, `next()`, which invites the source to produce the next value

Therefore, a consumable is simply an observable which does not produce values until it is invited to. In many analyses this is called a "pull" model – we "pull" values from the stream source one at a time; often contrasted with the native "push" model of RxJS in which the source produces values as fast as it can.

Here is an example of subscribing to a consumable:

```ts
function consume(values: Consumable<number>) {
  // We use the Observable.subscribe method as normal
  values.subscribe(async nextBite => {
    // Each value supplied to the subscriber is a bite
    try {
      // Hard work takes time, but the consumable will wait for us...
      await hardWork(nextBite.value);
    } finally {
      // ... until we ask for the next bite
      nextBite.next();
      // This subscriber will be called again if there are any more values
    }
  });
}
```

(Note that `Observable.subscribe` is already a "pull"-style method. Many observables will not produce anything until subscribed to, irrespective of their subsequent speed. **rx-flowable** affords this possibility at a granular level.)

The principle of consuming bites by calling `next` is simple and powerful, but has an important downside. That is, if `next` is _not_ called, the next value will _not_ be produced, and the source may hang on to some underlying resource indefinitely. This means that consumables are generally more prone to resource leaks than observables. In the example above, we take care to wrap the hard work in a try-finally block to mitigate this – assuming for simplicity that any error is not catastrophic and we can continue processing.

Once subscribed, consumables are "hot". If multiple subscribers are attached to a consumable, late subscribers will only receive values that prior subscribers have invited from the source. Further, the consumable will produce values at the pace of the slowest subscriber. That is, a value is not produced until _every_ subscriber has invited it.

In case we want to stop processing, instead of calling `next` it is possible to unsubscribe from the consumable. Once the last subscriber has unsubscribed, the consumable is able to release its held resources.

## flowable

If the speed of the subscriber is unknown at design time, for example if the streaming is part of a library interface, then a consumable can be wrapped as a Flowable. A flowable is also an observable, directly of values (so that it is straightforward to use in pipelining), but with a `consume` property to re-enter the back-pressured world:

```js
// Database library code:
function readFromDatabase(query) {
  const stream = this.db.readStream(query);
  const consumable = consume(stream); // See sources, below
  return flowable(consumable);
}
// ... client 1:
{
  const cursor = readFromDatabase('SELECT * FROM DATA');
  // Using the flowable directly as an observable without calling next()
  cursor.pipe(filter(isPrintable)).subscribe(console.log);
}
// ... client 2:
{
  const cursor = readFromDatabase('SELECT * FROM DATA');
  // OR using it as a consumable to back-pressure from an expensive downstream
  cursor.consume.subscribe(({ value, next }) =>
    transformAndLoad(value).finally(next));
}
```

A subscriber via `Observable.subscribe()` always receives all data, but it may be delayed by any subscribed consumers.

## sources

This library provides implementations of Consumable for the following common sources of values:

- Javascript Iterables
- Promises
- Readables (such as NodeJS Readables)
- Other observables (non-consumable observables will buffer values)

These can be constructed using the `consume` function in the `consume` module.

## operators

Consumables can be pipelined using RxJS [operators](https://rxjs.dev/guide/operators). These native operators will see bites instead of raw values. Care must be taken to ensure that `next` is called correctly for every _input_ bite, if the pipeline is to complete successfully. Since this can sometimes require non-obvious but actually boilerplate code, this library provides specialised operators which can be used in place of native ones to correctly handle calling of `next` in common situations.

- `flatMap` is a specialisation of `concatMap`
- `ignoreIf` is like an inverse of `filter` 
- `batch` is a specialisation of `bufferCount`
- _Please [suggest](https://github.com/gsvarovsky/rx-flowable/issues) or Pull Request!_

## biblio

### background

- ReactiveX, _RxJS: Reactive Extensions For JavaScript_, https://github.com/ReactiveX/rxjs
- ReactiveX, _backpressure operators_, https://reactivex.io/documentation/operators/backpressure.html (note: the reference to RxJS `ControlledObservable` is not applicable to RxJS 7, see below)
- ReactiveX, _RxJS v4 Rx.Observable.prototype.controlled_, https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/operators/controlled.md
- Reactive Streams, _Reactive Streams is an initiative to provide a standard for asynchronous stream processing with non-blocking back pressure._ https://www.reactive-streams.org/

### alternatives

- NodeJS, _A stream is an abstract interface for working with streaming data in Node.js_, https://nodejs.org/docs/latest/api/stream.html
- WhatWG, _Streams: APIs for creating, composing, and consuming streams of data that map efficiently to low-level I/O primitives_, https://streams.spec.whatwg.org/
- ReactiveX, _The Interactive Extensions for JavaScript (IxJS)_, https://github.com/ReactiveX/IxJS
- Ruben Verborgh, _Asynchronous iterators for JavaScript_, https://github.com/RubenVerborgh/AsyncIterator
- Kevin Ghadyani, _Lossless Backpressure in RxJS_, https://itnext.io/lossless-backpressure-in-rxjs-b6de30a1b6d4