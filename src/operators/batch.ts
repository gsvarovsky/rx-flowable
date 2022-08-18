import {
  AsyncSubject, concatMap, concatWith, ignoreElements, OperatorFunction, pipe, reduce, windowCount
} from 'rxjs';
import { ignoreIf } from './ignoreIf';
import { Bite } from '..';

export function batch<T>(size: number): OperatorFunction<Bite<T>, Bite<T[]>> {
  return pipe(
    windowCount(size),
    concatMap(window => {
      // Must not complete until last value is nexted
      const release = new AsyncSubject();
      return window.pipe(
        reduce((batchBite, { value, next }, index) => {
          batchBite.value.push(value);
          if (index < size - 1) {
            next();
          } else {
            release.complete();
            batchBite.next = next;
          }
          return batchBite;
        }, {
          value: [],
          next: () => {
            release.complete();
            return true;
          }
        } as Bite<T[]>),
        concatWith(release.pipe(ignoreElements())),
        ignoreIf(batch => !batch.length));
    }));
}