import { Observable } from 'rxjs';

/**
 * A consumable is an observable that is
 * - always in pull/paused/consuming mode (cf. {@link Flowable})
 * - hot if there is at least one subscriber (not represented in the typing)
 *
 * This is an interface to ease the use of RxJS pipe operators and utilities
 * like `EMPTY`. However note that some (e.g. `from` and `merge`)
 * may create misbehaving consumables that flow with incorrect backpressure.
 *
 * Note that a consumable is generally more prone to resource leaks than a
 * typical observable, because resources may be held open while waiting for
 * backpressure to be relieved by a call to {@link Bite.next()}. Such leaks
 * can even occur if the consumable is never subscribed, because of pre-emptive
 * actions taken when it was created, prior to the first consumer/subscriber.
 *
 * @see Bite
 */
export interface Consumable<T> extends Observable<Bite<T>> {
  /** @deprecated use {@link each} */
  forEach(next: (value: Bite<T>) => void): Promise<void>;
}

/**
 * One value being processed by a consumer. On receipt of a bite, every consumer
 * must either call {@link next} or unsubscribe, to allow the further items to
 * arrive (to other subscribers). Therefore, a consumable always flows at the
 * pace of he slowest consumer.
 *
 * When piping a consumable, it's essential to call done() for every item
 * which does not make it to the output, for example due to a filter or reduce.

 * @see Consumable
 */
export interface Bite<T> {
  value: T;
  /**
   * Call to release the next value for consumption.
   * @returns true for expressions like `next() && 'hello'`
   */
  next(): true;
}

/**
 * A flowable can be in pull/paused ("consuming") mode or push/flowing mode, like a stream.
 * The mode is initially decided by which `subscribe()` method is called first:
 * - If `Observable.subscribe()` is called first, the mode is flowing
 * - If `Flowable.consume.subscribe()` is called first, the mode is consuming
 *
 * A subscriber via `Observable.subscribe()` always receives all data, but it
 * may be delayed by any subscribed consumers (like 'data' events).
 *
 * A flowable is always multicast, and hot if there is at least one subscriber.
 *
 * @see https://nodejs.org/api/stream.html#two-reading-modes
 */
export interface Flowable<T> extends Observable<T> {
  readonly consume: Consumable<T>;
}

export * from './functions';