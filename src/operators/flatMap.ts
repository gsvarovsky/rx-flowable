import { concatMap, OperatorFunction, tap } from 'rxjs';
import { Bite, Consumable } from '..';

/**
 * Consumable flavour of concat mapping.
 */
export function flatMap<T, R>(
  project: (value: T) => Consumable<R>): OperatorFunction<Bite<T>, Bite<R>> {
  return concatMap(({ value, next }) => project(value)
    .pipe(tap({ complete: next })));
}