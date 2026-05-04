import type { Request, Response } from 'express';
import { z } from 'zod';
import { UnauthorizedError } from '../../lib/errors.js';
import * as progressService from './progress.service.js';

const createSessionBodySchema = z.object({
    library_entry_id: z.string().uuid(),
    pages_read: z.number().int().positive().max(10000),
    duration_minutes: z.number().int().positive().max(1440).optional(),
    logged_at: z.string().datetime().optional(),
});

const listSessionsQuerySchema = z.object({
    library_entry_id: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});

const idParamSchema = z.object({
    id: z.string().uuid('Invalid session id'),
});

const statsQuerySchema = z.object({
    period: z.enum(['week', 'month', 'year', 'all']).default('all'),
});

export async function logSession(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const body = createSessionBodySchema.parse(req.body);
    const result = await progressService.logSession(req.supabase, body);
    res.status(201).json(result);
}

export async function listSessions(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const filters = listSessionsQuerySchema.parse(req.query);
    const result = await progressService.listSessions(req.supabase, filters);
    res.json(result);
}

export async function deleteSession(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const { id } = idParamSchema.parse(req.params);
    await progressService.deleteSession(req.supabase, id);
    res.status(204).send();
}

export async function getStats(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const { period } = statsQuerySchema.parse(req.query);
    const stats = await progressService.getStats(req.supabase, period);
    res.json(stats);
}