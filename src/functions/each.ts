import type { Observable, Subscription } from 'rxjs';
import type { Consumable } from '..';

/**
 * Replacement for {@link Observable.forEach}, which consumes each item one-by-one
 * @param consumable the consumable to consume
 * @param handle a handler for each item consumed
 */
export function each<T>(
  consumable: Consumable<T>, handle: (value: T) => any): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let subscription: Subscription;
    subscription = consumable.subscribe({
      next: async ({ value, next }) => {
        try {
          await handle(value);
          next();
        } catch (err) {
          reject(err);
          subscription?.unsubscribe();
        }
      },
      error: reject,
      complete: resolve
    });
  });
}