import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Client minimaliste pour l'API ISBNdb v2.
 * Doc : https://isbndb.com/apidocs/v2
 */

export interface IsbndbBook {
    isbn?: string;
    isbn13?: string;
    title?: string;
    title_long?: string;
    authors?: string[];
    publisher?: string;
    language?: string;
    date_published?: string;
    pages?: number;
    image?: string;
    synopsis?: string;
    overview?: string;
    subjects?: string[];
    binding?: string;
    edition?: string;
    // ISBNdb peut ajouter d'autres champs, on garde tout dans isbndb_raw côté DB
    [key: string]: unknown;
}

interface SearchResponse {
    total: number;
    books: IsbndbBook[];
}

interface BookResponse {
    book: IsbndbBook;
}

class IsbndbError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message);
        this.name = 'IsbndbError';
    }
}

async function isbndbFetch<T>(path: string): Promise<T> {
    const url = `${env.ISBNDB_BASE_URL}${path}`;

    const response = await fetch(url, {
        headers: {
            Authorization: env.ISBNDB_API_KEY,
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        logger.warn(
            { status: response.status, path, body: body.slice(0, 200) },
            'ISBNdb request failed',
        );
        throw new IsbndbError(response.status, `ISBNdb error: ${response.status}`);
    }

    return response.json() as Promise<T>;
}

/**
 * Récupère un livre par son ISBN (10 ou 13 chiffres).
 * Retourne null si le livre n'existe pas (404 ISBNdb).
 */
export async function fetchBookByIsbn(isbn: string): Promise<IsbndbBook | null> {
    try {
        const data = await isbndbFetch<BookResponse>(`/book/${encodeURIComponent(isbn)}`);
        return data.book;
    } catch (err) {
        if (err instanceof IsbndbError && err.statusCode === 404) {
            return null;
        }
        throw err;
    }
}

/**
 * Recherche de livres par mot-clé (titre, auteur...).
 * @param query terme de recherche
 * @param options pagination (max 20 résultats par page recommandé pour le quota)
 */
export async function searchBooks(
    query: string,
    options: { page?: number; pageSize?: number; column?: 'title' | 'author' } = {},
): Promise<SearchResponse> {
    const { page = 1, pageSize = 10, column } = options;
    const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });
    if (column) params.set('column', column);

    return isbndbFetch<SearchResponse>(
        `/books/${encodeURIComponent(query)}?${params.toString()}`,
    );
}

export { IsbndbError };