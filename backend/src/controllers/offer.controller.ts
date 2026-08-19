import { Request, Response } from 'express';
import { z } from 'zod';
import { createOffer, findOfferById, markOfferAccepted, declineOtherOffers } from '../models/offer.model';
import { findRequestById, updateRequestStatus } from '../models/request.model';
import { createOrder } from '../models/order.model';
import { ApiError } from '../middleware/errorHandler';

const createOfferSchema = z.object({
  requestId: z.string().uuid(),
  estimatedItemPriceUgx: z.number().int().positive().optional(),
  shoppingFeeUgx: z.number().int().nonnegative(),
  deliveryFeeUgx: z.number().int().nonnegative(),
  estimatedMinutes: z.number().int().positive().optional(),
  message: z.string().max(500).optional(),
});

export async function submitOffer(req: Request, res: Response) {
  const input = createOfferSchema.parse(req.body);

  const requestRow = await findRequestById(input.requestId);
  if (!requestRow) throw new ApiError(404, 'Request not found');
  if (requestRow.status !== 'open' && requestRow.status !== 'offer_received') {
    throw new ApiError(409, 'This request is no longer accepting offers');
  }

  const offer = await createOffer({
    requestId: input.requestId,
    shopperId: req.user!.id,
    estimatedItemPriceUgx: input.estimatedItemPriceUgx,
    shoppingFeeUgx: input.shoppingFeeUgx,
    deliveryFeeUgx: input.deliveryFeeUgx,
    estimatedMinutes: input.estimatedMinutes,
    message: input.message,
  });

  if (requestRow.status === 'open') {
    await updateRequestStatus(requestRow.id, 'offer_received');
  }

  res.status(201).json({ offer });
}

const acceptOfferSchema = z.object({ offerId: z.string().uuid() });

export async function acceptOffer(req: Request, res: Response) {
  const { offerId } = acceptOfferSchema.parse(req.body);

  const offer = await findOfferById(offerId);
  if (!offer) throw new ApiError(404, 'Offer not found');
  if (offer.status !== 'pending') throw new ApiError(409, 'This offer is no longer available');

  const requestRow = await findRequestById(offer.request_id);
  if (!requestRow) throw new ApiError(404, 'Request not found');
  if (requestRow.customer_id !== req.user!.id) throw new ApiError(403, 'Not authorized to accept this offer');
  if (requestRow.status === 'assigned') throw new ApiError(409, 'This request already has an assigned shopper');

  await markOfferAccepted(offerId);
  await declineOtherOffers(offer.request_id, offerId);
  await updateRequestStatus(offer.request_id, 'assigned');

  const order = await createOrder({
    requestId: offer.request_id,
    acceptedOfferId: offer.id,
    customerId: requestRow.customer_id,
    shopperId: offer.shopper_id,
    shoppingFeeUgx: offer.shopping_fee_ugx,
    deliveryFeeUgx: offer.delivery_fee_ugx,
    deliveryAddressId: requestRow.delivery_address_id,
  });

  res.status(201).json({ order });
}
