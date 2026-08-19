import { query, queryOne } from '../db/pool';
import { RequestStatus, SourcingType } from '../types';

export interface RequestRow {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  sourcing_type: SourcingType;
  location_id: string | null;
  social_seller_url: string | null;
  budget_min_ugx: number | null;
  budget_max_ugx: number;
  delivery_address_id: string;
  status: RequestStatus;
  notes_for_shopper: string | null;
  created_at: string;
  updated_at: string;
}

export async function createRequest(input: {
  customerId: string;
  title: string;
  description?: string;
  sourcingType: SourcingType;
  locationId?: string | null;
  socialSellerUrl?: string | null;
  budgetMinUgx?: number | null;
  budgetMaxUgx: number;
  deliveryAddressId: string;
  notesForShopper?: string | null;
}): Promise<RequestRow> {
  const row = await queryOne<RequestRow>(
    `INSERT INTO shopping_requests
      (customer_id, title, description, sourcing_type, location_id, social_seller_url,
       budget_min_ugx, budget_max_ugx, delivery_address_id, notes_for_shopper, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'open')
     RETURNING *`,
    [
      input.customerId,
      input.title,
      input.description ?? null,
      input.sourcingType,
      input.locationId ?? null,
      input.socialSellerUrl ?? null,
      input.budgetMinUgx ?? null,
      input.budgetMaxUgx,
      input.deliveryAddressId,
      input.notesForShopper ?? null,
    ]
  );
  if (!row) throw new Error('Failed to create request');
  return row;
}

export async function addRequestItem(requestId: string, item: {
  name: string;
  quantity?: string;
  description?: string;
  referencePhotoUrl?: string;
}) {
  return queryOne(
    `INSERT INTO shopping_request_items (request_id, name, quantity, description, reference_photo_url)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [requestId, item.name, item.quantity ?? '1', item.description ?? null, item.referencePhotoUrl ?? null]
  );
}

export async function findRequestById(id: string): Promise<RequestRow | null> {
  return queryOne<RequestRow>('SELECT * FROM shopping_requests WHERE id = $1', [id]);
}

export async function listRequestsForCustomer(customerId: string): Promise<RequestRow[]> {
  return query<RequestRow>(
    'SELECT * FROM shopping_requests WHERE customer_id = $1 ORDER BY created_at DESC',
    [customerId]
  );
}

/** Requests visible to shoppers: open ones, optionally filtered by location. */
export async function listOpenRequests(filters: { locationId?: string }): Promise<RequestRow[]> {
  if (filters.locationId) {
    return query<RequestRow>(
      `SELECT * FROM shopping_requests WHERE status = 'open' AND location_id = $1 ORDER BY created_at DESC`,
      [filters.locationId]
    );
  }
  return query<RequestRow>(`SELECT * FROM shopping_requests WHERE status = 'open' ORDER BY created_at DESC`);
}

export async function updateRequestStatus(id: string, status: RequestStatus) {
  return queryOne<RequestRow>(
    'UPDATE shopping_requests SET status = $2 WHERE id = $1 RETURNING *',
    [id, status]
  );
}

export async function getRequestItems(requestId: string) {
  return query('SELECT * FROM shopping_request_items WHERE request_id = $1 ORDER BY created_at', [requestId]);
}
