import { Observable, Subscriber } from 'rxjs';
import type { Consumable, Flowable } from '..';

/**
 * Duck-typing an observable to see if it supports backpressure.
 */
export function isFlowable<T>(observable: Observable<T>): observable is Flowable<T> {
  return 'consume' in observable;
}
/**
 * Creates a flowable from some source consumable.
 */
export function flowable<T>(source: Consumable<T>): Flowable<T> {
  return new class extends Observable<T> implements Flowable<T> {
    readonly consume = source;
    constructor() {
      /* The observable (push) world just calls done for every item.
      Since the consumable flows at the pace of the slowest consumer,
      a subscriber to the source consumable will delay items. */
      super(subs => flow(source, subs));
    }
  }();
}
/**
 * Flows the given consumable to the subscriber with no back-pressure.
 * @see Flowable
 */
export function flow<T>(consumable: Consumable<T>, subs: Subscriber<T>) {
  return consumable.subscribe({
    next({ value, next }) {
      subs.next(value);
      next();
    },
    complete: () => subs.complete(),
    error: err => subs.error(err)
  });
}