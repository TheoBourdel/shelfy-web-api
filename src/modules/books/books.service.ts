import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError, BadRequestError } from '../../lib/errors.js';
import { fetchBookByIsbn, searchBooks as isbndbSearch } from '../../lib/isbndb.js';
import * as booksRepo from './books.repository.js';
import type { Book } from './books.repository.js';

/**
 * Récupère un livre par ISBN avec stratégie cache-first :
 * 1. Cherche dans notre table books (cache)
 * 2. Si pas trouvé, query ISBNdb
 * 3. Si trouvé sur ISBNdb, on cache et on retourne
 */
export async function getOrFetchByIsbn(
    client: SupabaseClient,
    isbn: string,
): Promise<Book> {
    const cleaned = isbn.replace(/[-\s]/g, '');
    if (!/^\d{10}(\d{3})?$/.test(cleaned)) {
        throw new BadRequestError('Invalid ISBN format (expected 10 or 13 digits)');
    }

    // 1. Cache local
    const cached = await booksRepo.findByIsbn(client, cleaned);
    if (cached) return cached;

    // 2. ISBNdb
    const raw = await fetchBookByIsbn(cleaned);
    if (!raw) {
        throw new NotFoundError(`Book with ISBN ${cleaned} not found`);
    }

    // 3. Cache + retour
    return booksRepo.upsertFromIsbndb(raw);
}

export interface SearchResult {
    total: number;
    books: Array<{
        isbn13: string | null;
        isbn10: string | null;
        title: string;
        authors: string[];
        cover_url: string | null;
        publisher: string | null;
    }>;
}

/**
 * Recherche dans ISBNdb. On NE cache PAS les résultats de recherche,
 * seulement quand l'user clique sur un livre pour l'ajouter à sa bibliothèque.
 */
export async function search(
    query: string,
    options: { page?: number; pageSize?: number } = {},
): Promise<SearchResult> {
    if (query.trim().length < 2) {
        throw new BadRequestError('Query must be at least 2 characters');
    }

    const result = await isbndbSearch(query.trim(), {
        page: options.page ?? 1,
        pageSize: Math.min(options.pageSize ?? 10, 20),
    });

    return {
        total: result.total,
        books: result.books.map((b) => ({
            isbn13: b.isbn13 ?? null,
            isbn10: b.isbn ?? null,
            title: b.title ?? b.title_long ?? 'Unknown',
            authors: b.authors ?? [],
            cover_url: b.image ?? null,
            publisher: b.publisher ?? null,
        })),
    };
}

export async function getById(client: SupabaseClient, id: string): Promise<Book> {
    const book = await booksRepo.findById(client, id);
    if (!book) throw new NotFoundError(`Book ${id} not found`);
    return book;
}