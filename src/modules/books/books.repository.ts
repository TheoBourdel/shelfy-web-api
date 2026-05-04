import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../lib/supabase.js';
import type { IsbndbBook } from '../../lib/isbndb.js';

export interface Book {
    id: string;
    isbn13: string | null;
    isbn10: string | null;
    title: string;
    subtitle: string | null;
    authors: string[];
    publisher: string | null;
    published_date: string | null;
    page_count: number | null;
    language: string | null;
    description: string | null;
    cover_url: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Cherche un livre par ISBN dans notre cache (table books).
 * Lecture publique → on peut utiliser un client user ou admin.
 */
export async function findByIsbn(
    client: SupabaseClient,
    isbn: string,
): Promise<Book | null> {
    const { data, error } = await client
        .from('books')
        .select('*')
        .or(`isbn13.eq.${isbn},isbn10.eq.${isbn}`)
        .maybeSingle();

    if (error) throw error;
    return data as Book | null;
}

export async function findById(
    client: SupabaseClient,
    id: string,
): Promise<Book | null> {
    const { data, error } = await client
        .from('books')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) throw error;
    return data as Book | null;
}

/**
 * Insère ou met à jour un livre depuis les données ISBNdb.
 * On utilise supabaseAdmin car les écritures sur books passent toujours
 * par le backend (pas de policy d'insert pour authenticated).
 */
export async function upsertFromIsbndb(raw: IsbndbBook): Promise<Book> {
    const isbn13 = raw.isbn13 ?? null;
    const isbn10 = raw.isbn ?? null;

    if (!isbn13 && !isbn10) {
        throw new Error('Cannot upsert book without ISBN');
    }

    const payload = {
        isbn13,
        isbn10,
        title: raw.title ?? raw.title_long ?? 'Unknown title',
        subtitle: raw.title_long && raw.title_long !== raw.title ? raw.title_long : null,
        authors: raw.authors ?? [],
        publisher: raw.publisher ?? null,
        published_date: raw.date_published ?? null,
        page_count: raw.pages ?? null,
        language: raw.language ?? null,
        description: raw.synopsis ?? raw.overview ?? null,
        cover_url: raw.image ?? null,
        isbndb_raw: raw,
    };

    // Upsert sur la contrainte unique isbn13 (qui est unique en DB)
    // Si pas d'isbn13, on insère un nouveau record
    const { data, error } = await supabaseAdmin
        .from('books')
        .upsert(payload, {
            onConflict: 'isbn13',
            ignoreDuplicates: false,
        })
        .select()
        .single();

    if (error) throw error;
    return data as Book;
}