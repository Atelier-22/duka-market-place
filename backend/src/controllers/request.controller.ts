import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createRequest, addRequestItem, findRequestById, listRequestsForCustomer,
  listOpenRequests, getRequestItems,
} from '../models/request.model';
import { listOffersForRequest } from '../models/offer.model';
import { ApiError } from '../middleware/errorHandler';

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
        referencePhotoUrl: z.string().url().optional(),
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

  res.status(201).json({ request: requestRow });
}

export async function getById(req: Request, res: Response) {
  const requestRow = await findRequestById(req.params.id);
  if (!requestRow) throw new ApiError(404, 'Request not found');

  const isOwner = requestRow.customer_id === req.user!.id;
  if (!isOwner && req.user!.role !== 'admin' && req.user!.role !== 'shopper') {
    throw new ApiError(403, 'Not authorized to view this request');
  }

  const items = await getRequestItems(requestRow.id);
  const offers = await listOffersForRequest(requestRow.id);

  res.json({ request: requestRow, items, offers });
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
