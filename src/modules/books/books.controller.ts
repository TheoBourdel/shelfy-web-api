import type { Request, Response } from 'express';
import { z } from 'zod';
import { UnauthorizedError } from '../../lib/errors.js';
import * as booksService from './books.service.js';

const searchQuerySchema = z.object({
    q: z.string().min(2, 'Query must be at least 2 characters'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(20).default(10),
});

const isbnParamSchema = z.object({
    isbn: z.string().regex(/^[\d-\s]+$/, 'Invalid ISBN format'),
});

const idParamSchema = z.object({
    id: z.string().uuid('Invalid book id'),
});

export async function search(req: Request, res: Response) {
    const { q, page, pageSize } = searchQuerySchema.parse(req.query);
    const result = await booksService.search(q, { page, pageSize });
    res.json(result);
}

export async function getByIsbn(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const { isbn } = isbnParamSchema.parse(req.params);
    const book = await booksService.getOrFetchByIsbn(req.supabase, isbn);
    res.json(book);
}

export async function getById(req: Request, res: Response) {
    if (!req.supabase) throw new UnauthorizedError();
    const { id } = idParamSchema.parse(req.params);
    const book = await booksService.getById(req.supabase, id);
    res.json(book);
}