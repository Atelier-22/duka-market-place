import { query, queryOne } from '../db/pool';
import { OfferStatus } from '../types';

export interface OfferRow {
  id: string;
  request_id: string;
  shopper_id: string;
  estimated_item_price_ugx: number | null;
  shopping_fee_ugx: number;
  delivery_fee_ugx: number;
  estimated_minutes: number | null;
  message: string | null;
  status: OfferStatus;
  created_at: string;
}

export async function createOffer(input: {
  requestId: string;
  shopperId: string;
  estimatedItemPriceUgx?: number | null;
  shoppingFeeUgx: number;
  deliveryFeeUgx: number;
  estimatedMinutes?: number | null;
  message?: string | null;
}): Promise<OfferRow> {
  const row = await queryOne<OfferRow>(
    `INSERT INTO shopper_offers
      (request_id, shopper_id, estimated_item_price_ugx, shopping_fee_ugx, delivery_fee_ugx, estimated_minutes, message)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (request_id, shopper_id) DO UPDATE SET
       estimated_item_price_ugx = EXCLUDED.estimated_item_price_ugx,
       shopping_fee_ugx = EXCLUDED.shopping_fee_ugx,
       delivery_fee_ugx = EXCLUDED.delivery_fee_ugx,
       estimated_minutes = EXCLUDED.estimated_minutes,
       message = EXCLUDED.message,
       status = 'pending',
       updated_at = now()
     RETURNING *`,
    [
      input.requestId,
      input.shopperId,
      input.estimatedItemPriceUgx ?? null,
      input.shoppingFeeUgx,
      input.deliveryFeeUgx,
      input.estimatedMinutes ?? null,
      input.message ?? null,
    ]
  );
  if (!row) throw new Error('Failed to create offer');
  return row;
}

export async function listOffersForRequest(requestId: string): Promise<OfferRow[]> {
  return query<OfferRow>(
    `SELECT o.*, u.full_name AS shopper_name, sp.rating_avg, sp.rating_count, sp.completed_jobs
     FROM shopper_offers o
     JOIN users u ON u.id = o.shopper_id
     JOIN shopper_profiles sp ON sp.user_id = o.shopper_id
     WHERE o.request_id = $1 AND o.status = 'pending'
     ORDER BY o.created_at ASC`,
    [requestId]
  );
}

export async function findOfferById(id: string): Promise<OfferRow | null> {
  return queryOne<OfferRow>('SELECT * FROM shopper_offers WHERE id = $1', [id]);
}

export async function markOfferAccepted(id: string) {
  return queryOne<OfferRow>(`UPDATE shopper_offers SET status = 'accepted' WHERE id = $1 RETURNING *`, [id]);
}

export async function declineOtherOffers(requestId: string, acceptedOfferId: string) {
  return query(
    `UPDATE shopper_offers SET status = 'declined' WHERE request_id = $1 AND id != $2 AND status = 'pending'`,
    [requestId, acceptedOfferId]
  );
}
