import type { Request, Response } from 'express';
import { z } from 'zod';
import { UnauthorizedError } from '../../lib/errors.js';
import * as libraryService from './library.service.js';

const readingStatusSchema = z.enum(['to_read', 'reading', 'read', 'abandoned']);

const listQuerySchema = z.object({
    status: readingStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});

const idParamSchema = z.object({
    id: z.string().uuid('Invalid entry id'),
});

const addBookBodySchema = z.object({
    isbn: z.string().min(10).max(17),
    status: readingStatusSchema.optional(),
});

const updateBodySchema = z
    .object({
        status: readingStatusSchema.optional(),
        current_page: z.number().int().min(0).optional(),
        rating: z.number().int().min(1).max(5).nullable().optional(),
        notes: z.string().max(5000).nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided',
    });

export async function list(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const filters = listQuerySchema.parse(req.query);
    const result = await libraryService.listForUser(req.supabase, filters);
    res.json(result);
}

export async function getById(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const { id } = idParamSchema.parse(req.params);
    const entry = await libraryService.getById(req.supabase, id);
    res.json(entry);
}

export async function addBook(req: Request, res: Response) {
    if (!req.supabase || !req.user) throw new UnauthorizedError();
    const body = addBookBodySchema.parse(req.body);
    const entry = await libraryService.addBook(req.supabase, req.user.id, body);
    res.status(201).json(entry);
}

export async function update(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const { id } = idParamSchema.parse(req.params);
    const body = updateBodySchema.parse(req.body);
    const entry = await libraryService.updateEntry(req.supabase, id, body);
    res.json(entry);
}

export async function remove(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const { id } = idParamSchema.parse(req.params);
    await libraryService.removeEntry(req.supabase, id);
    res.status(204).send();
}

export async function counts(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const counts = await libraryService.countByStatusForUser(req.supabase);
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    res.json({ counts, total });
}