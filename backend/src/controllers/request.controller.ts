import { Request, Response } from 'express';
import { z } from 'zod';
import { mediaUrl } from '../utils/validators';
import {
  createRequest, addRequestItem, findRequestById, listRequestsForCustomer,
  listOpenRequests, getRequestItems, updateRequestStatus,
} from '../models/request.model';
import { listOffersForRequest } from '../models/offer.model';
import { notifyShoppersOfNewRequest } from '../services/notification.service';
import { ApiError } from '../middleware/errorHandler';
import { query, queryOne } from '../db/pool';
import { hasOversight } from '../utils/roles';

const createRequestSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  sourcingType: z.enum(['specific_market', 'specific_shop', 'social_seller', 'shopper_choice']),
  locationId: z.string().uuid().optional().nullable(),
  socialSellerUrl: z.string().url().optional().nullable(),
  budgetMinUgx: z.number().int().positive().optional().nullable(),
  budgetMaxUgx: z.number().int().positive(),
  deliveryAddressId: z.string().uuid(),
  notesForShopper: z.string().max(1000).optional().nullable(),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        quantity: z.string().max(50).optional(),
        description: z.string().max(500).optional(),
        referencePhotoUrl: mediaUrl.optional(),
      })
    )
    .min(1),
});

export async function create(req: Request, res: Response) {
  const input = createRequestSchema.parse(req.body);

  const requestRow = await createRequest({
    customerId: req.user!.id,
    title: input.title,
    description: input.description,
    sourcingType: input.sourcingType,
    locationId: input.locationId,
    socialSellerUrl: input.socialSellerUrl,
    budgetMinUgx: input.budgetMinUgx,
    budgetMaxUgx: input.budgetMaxUgx,
    deliveryAddressId: input.deliveryAddressId,
    notesForShopper: input.notesForShopper,
  });

  for (const item of input.items) {
    await addRequestItem(requestRow.id, item);
  }

  const alerted = await notifyShoppersOfNewRequest({
    requestId: requestRow.id,
    customerId: req.user!.id,
    title: input.title,
    budgetMaxUgx: input.budgetMaxUgx ?? null,
  });

  res.status(201).json({ request: requestRow, shoppersAlerted: alerted });
}

export async function getById(req: Request, res: Response) {
  const requestRow = await findRequestById(req.params.id);
  if (!requestRow) throw new ApiError(404, 'Request not found');

  const isOwner = requestRow.customer_id === req.user!.id;
  if (!isOwner && !hasOversight(req.user!.role) && req.user!.role !== 'shopper') {
    throw new ApiError(403, 'Not authorized to view this request');
  }

  const items = await getRequestItems(requestRow.id);
  const allOffers = await listOffersForRequest(requestRow.id);
  const offers = isOwner || hasOversight(req.user!.role)
    ? allOffers
    : allOffers.filter((o) => o.shopper_id === req.user!.id);

  // Once a shopper is chosen the pending offers are gone; hand back the order instead.
  const order = requestRow.status === 'assigned'
    ? await queryOne<{ id: string; status: string }>(
        'SELECT id, status FROM orders WHERE request_id = $1 ORDER BY created_at DESC LIMIT 1',
        [requestRow.id]
      )
    : null;

  res.json({ request: requestRow, items, offers, order });
}

/** Customer withdraws a request that has not been assigned yet. */
export async function cancel(req: Request, res: Response) {
  const requestRow = await findRequestById(req.params.id);
  if (!requestRow) throw new ApiError(404, 'Request not found');
  if (requestRow.customer_id !== req.user!.id && !hasOversight(req.user!.role)) {
    throw new ApiError(403, 'Not authorized to cancel this request');
  }
  if (requestRow.status !== 'open' && requestRow.status !== 'offer_received') {
    throw new ApiError(409, 'This request already has a shopper — cancel the order instead');
  }

  await query(
    `UPDATE shopper_offers SET status = 'declined' WHERE request_id = $1 AND status = 'pending'`,
    [requestRow.id]
  );
  const updated = await updateRequestStatus(requestRow.id, 'cancelled');
  res.json({ request: updated });
}

export async function listMine(req: Request, res: Response) {
  const requests = await listRequestsForCustomer(req.user!.id);
  res.json({ requests });
}

export async function listAvailable(req: Request, res: Response) {
  const locationId = typeof req.query.locationId === 'string' ? req.query.locationId : undefined;
  const requests = await listOpenRequests({ locationId });
  res.json({ requests });
}
