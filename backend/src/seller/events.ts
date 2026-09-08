import { EventEmitter } from 'events';

export type ProductEventName = 'product.created' | 'product.updated' | 'product.published' | 'product.unpublished';

export interface ProductEvent {
  productId: string;
  ownerId: string;
  storeId: string;
}

export const productEvents = new EventEmitter();
productEvents.setMaxListeners(20);

export function emitProductEvent(name: ProductEventName, payload: ProductEvent) {
  setImmediate(() => {
    try {
      productEvents.emit(name, payload);
    } catch (err) {
      console.error(`[events] ${name} listener failed`, err);
    }
  });
}

export function onProductEvent(name: ProductEventName, handler: (payload: ProductEvent) => Promise<void> | void) {
  productEvents.on(name, (payload: ProductEvent) => {
    Promise.resolve(handler(payload)).catch((err) => console.error(`[events] ${name} handler failed`, err));
  });
}
