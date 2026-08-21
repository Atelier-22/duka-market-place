import { Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { findOrderById } from '../models/order.model';
import { ApiError } from '../middleware/errorHandler';
import { notifyDeliveryScheduled, notifyDeliveryStarted } from '../services/notification.service';

/**
 * Live delivery tracking. The shopper's browser posts its position while an
 * order is in flight; the customer's map polls the latest one.
 *
 * Position is only ever accepted for, and readable on, an order the caller is
 * a participant in — a shopper's location is not public data.
 */

async function loadParticipantOrder(orderId: string, userId: string, role: string) {
  const order = await findOrderById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (role !== 'admin' && order.customer_id !== userId && order.shopper_id !== userId) {
    throw new ApiError(403, 'Not authorized to track this order');
  }
  return order;
}

/** Statuses during which a position is meaningful. Outside these, tracking stops. */
const TRACKABLE = ['shopper_assigned', 'shopping', 'item_found', 'awaiting_customer_approval', 'purchased', 'out_for_delivery'];

const positionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().nonnegative().max(100000).optional(),
});

export async function postPosition(req: Request, res: Response) {
  const input = positionSchema.parse(req.body);
  const order = await loadParticipantOrder(req.params.id, req.user!.id, req.user!.role);

  // Both sides may report. The shopper so the customer can watch them approach,
  // and the customer so the shopper can actually find them — "Mbalwa" is not a
  // location, and no address in this system has ever carried coordinates.
  const party = order.shopper_id === req.user!.id ? 'shopper'
    : order.customer_id === req.user!.id ? 'customer'
    : null;
  if (!party) {
    throw new ApiError(403, 'Only the two people on this order can report a position');
  }
  if (!TRACKABLE.includes(order.status)) {
    throw new ApiError(409, 'This order is not currently trackable');
  }

  await query(
    `INSERT INTO order_locations (order_id, user_id, party, lat, lng, accuracy_m)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [order.id, req.user!.id, party, input.lat, input.lng, input.accuracyM ?? null]
  );

  res.status(201).json({ ok: true, party });
}

interface LatLng { lat: number; lng: number }

/** Great-circle distance in metres. Good enough for a "how close are they" readout. */
function haversineMetres(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough city-traffic speed for a boda/walking mix, in metres per minute. */
const TRAVEL_METRES_PER_MINUTE = 300;

interface PositionRow { lat: string; lng: string; accuracy_m: string | null; recorded_at: string; party: string }

function toPoint(row: PositionRow | undefined) {
  if (!row) return null;
  return {
    lat: Number(row.lat),
    lng: Number(row.lng),
    accuracyM: row.accuracy_m ? Number(row.accuracy_m) : null,
    recordedAt: row.recorded_at,
  };
}

export async function getTracking(req: Request, res: Response) {
  const order = await loadParticipantOrder(req.params.id, req.user!.id, req.user!.role);

  // Latest report from each side in one query rather than two round trips.
  const positions = await query<PositionRow>(
    `SELECT DISTINCT ON (party) party, lat, lng, accuracy_m, recorded_at
       FROM order_locations WHERE order_id = $1
      ORDER BY party, recorded_at DESC`,
    [order.id]
  );

  const destination = await queryOne<{ lat: string | null; lng: string | null; line1: string }>(
    'SELECT lat, lng, line1 FROM addresses WHERE id = $1',
    [order.delivery_address_id]
  );

  const shopper = toPoint(positions.find((p) => p.party === 'shopper'));
  const customer = toPoint(positions.find((p) => p.party === 'customer'));

  const dest = destination?.lat && destination?.lng
    ? { lat: Number(destination.lat), lng: Number(destination.lng), label: destination.line1 }
    : null;

  // Where the shopper is actually heading: the customer's live position if they
  // are sharing it, otherwise the pin on their saved address. A live position
  // is the better target — people are not always standing at their address.
  const target = customer ?? dest;

  let distanceMetres: number | null = null;
  let etaMinutes: number | null = null;
  if (shopper && target) {
    distanceMetres = Math.round(haversineMetres(shopper, target));
    etaMinutes = Math.max(1, Math.round(distanceMetres / TRAVEL_METRES_PER_MINUTE));
  }

  res.json({
    trackable: TRACKABLE.includes(order.status),
    status: order.status,
    shopper,
    customer,
    destination: dest,
    distanceMetres,
    etaMinutes,
    // "Almost there" threshold — drives the arriving-soon banner on the map.
    isNearby: distanceMetres !== null && distanceMetres <= 500,
    shoppingDoneAt: order.shopping_done_at ?? null,
    deliveryStartedAt: order.delivery_started_at ?? null,
    deliveryEtaMinutes: order.delivery_eta_minutes ?? null,
    deliveryDeferredTo: order.delivery_deferred_to ?? null,
  });
}

const shoppingDoneSchema = z.object({
  /** false = the customer agreed to a later drop-off, so no countdown starts. */
  startDeliveryNow: z.boolean(),
  etaMinutes: z.number().int().positive().max(600).optional(),
  deferredTo: z.string().datetime().optional(),
});

/**
 * The shopper ticks "done shopping". Starting delivery now begins the ETA
 * countdown the customer sees; deferring records the agreed time instead and
 * leaves the clock stopped.
 */
export async function markShoppingDone(req: Request, res: Response) {
  const input = shoppingDoneSchema.parse(req.body);
  const order = await loadParticipantOrder(req.params.id, req.user!.id, req.user!.role);

  if (order.shopper_id !== req.user!.id) {
    throw new ApiError(403, 'Only the assigned shopper can mark shopping done');
  }
  if (!input.startDeliveryNow && !input.deferredTo) {
    throw new ApiError(400, 'A deferred delivery needs the agreed time');
  }

  // Every parameter inside a CASE needs an explicit cast: the other branch is
  // a bare NULL, so Postgres has nothing to infer the type from and falls back
  // to text — which then fails against the integer/timestamp columns.
  const updated = await queryOne(
    `UPDATE orders SET
       shopping_done_at     = COALESCE(shopping_done_at, now()),
       delivery_started_at  = CASE WHEN $2::boolean THEN now() ELSE NULL END,
       delivery_eta_minutes = CASE WHEN $2::boolean THEN $3::integer ELSE NULL END,
       delivery_deferred_to = CASE WHEN $2::boolean THEN NULL ELSE $4::timestamptz END
     WHERE id = $1 RETURNING *`,
    [order.id, input.startDeliveryNow, input.etaMinutes ?? 30, input.deferredTo ?? null]
  );

  if (input.startDeliveryNow) {
    await notifyDeliveryStarted({
      customerId: order.customer_id,
      orderId: order.id,
      etaMinutes: input.etaMinutes ?? 30,
      actorId: req.user!.id,
    });
  } else if (input.deferredTo) {
    await notifyDeliveryScheduled({
      customerId: order.customer_id,
      orderId: order.id,
      when: input.deferredTo,
      actorId: req.user!.id,
    });
  }

  res.json({ order: updated });
}
