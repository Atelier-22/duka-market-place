import { Request, Response } from 'express';
import {
  countUnread, listNotifications, markAllRead, markRead,
} from '../models/notification.model';
import { ApiError } from '../middleware/errorHandler';

export async function list(req: Request, res: Response) {
  const [notifications, unread] = await Promise.all([
    listNotifications(req.user!.id),
    countUnread(req.user!.id),
  ]);
  res.json({ notifications, unread });
}

/** Cheap endpoint for the bell badge to poll without pulling the whole list. */
export async function unreadCount(req: Request, res: Response) {
  res.json({ unread: await countUnread(req.user!.id) });
}

export async function read(req: Request, res: Response) {
  const row = await markRead(req.user!.id, req.params.id);
  // Already-read or someone else's id both land here; not found either way.
  if (!row) throw new ApiError(404, 'Notification not found');
  res.json({ notification: row });
}

export async function readAll(req: Request, res: Response) {
  res.json({ marked: await markAllRead(req.user!.id) });
}
