import type { Request, Response } from 'express';
import { z } from 'zod';
import { UnauthorizedError } from '../../lib/errors.js';
import * as shelvesService from './shelves.service.js';

const idParamSchema = z.object({
    id: z.string().uuid('Invalid shelf id'),
});

const idAndEntryParamSchema = z.object({
    id: z.string().uuid('Invalid shelf id'),
    entryId: z.string().uuid('Invalid library entry id'),
});

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

const createBodySchema = z.object({
    name: z.string().min(1).max(80).trim(),
    description: z.string().max(500).optional(),
    color: z.string().regex(hexColorRegex, 'Color must be a hex code').optional(),
});

const updateBodySchema = z
    .object({
        name: z.string().min(1).max(80).trim().optional(),
        description: z.string().max(500).nullable().optional(),
        color: z
            .string()
            .regex(hexColorRegex, 'Color must be a hex code')
            .nullable()
            .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided',
    });

const addEntryBodySchema = z.object({
    library_entry_id: z.string().uuid('Invalid library entry id'),
});

export async function list(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const shelves = await shelvesService.listForUser(req.supabase);
    res.json({ shelves });
}

export async function getById(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const { id } = idParamSchema.parse(req.params);
    const shelf = await shelvesService.getByIdWithEntries(req.supabase, id);
    res.json(shelf);
}

export async function create(req: Request, res: Response) {
    if (!req.supabase || !req.user) throw new UnauthorizedError();
    const body = createBodySchema.parse(req.body);
    const shelf = await shelvesService.createShelf(req.supabase, req.user.id, body);
    res.status(201).json(shelf);
}

export async function update(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const { id } = idParamSchema.parse(req.params);
    const body = updateBodySchema.parse(req.body);
    const shelf = await shelvesService.updateShelf(req.supabase, id, body);
    res.json(shelf);
}

export async function remove(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const { id } = idParamSchema.parse(req.params);
    await shelvesService.deleteShelf(req.supabase, id);
    res.status(204).send();
}

export async function addEntry(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const { id } = idParamSchema.parse(req.params);
    const { library_entry_id } = addEntryBodySchema.parse(req.body);
    await shelvesService.addEntryToShelf(req.supabase, id, library_entry_id);
    res.status(204).send();
}

export async function removeEntry(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const { id, entryId } = idAndEntryParamSchema.parse(req.params);
    await shelvesService.removeEntryFromShelf(req.supabase, id, entryId);
    res.status(204).send();
}