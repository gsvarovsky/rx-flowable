import { firstValueFrom } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { flowable } from './flow';
import type { Consumable } from '..';

export function drain<T>(c: Consumable<T>): Promise<T[]> {
  return firstValueFrom(flowable(c).pipe(toArray()));
}