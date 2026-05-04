import type { SupabaseClient } from '@supabase/supabase-js';
import type { Book } from '../books/books.repository.js';

export type ReadingStatus = 'to_read' | 'reading' | 'read' | 'abandoned';

export interface LibraryEntry {
    id: string;
    user_id: string;
    book_id: string;
    status: ReadingStatus;
    current_page: number;
    rating: number | null;
    notes: string | null;
    started_at: string | null;
    finished_at: string | null;
    created_at: string;
    updated_at: string;
}

// Type pour les listes : on joint le livre directement
export interface LibraryEntryWithBook extends LibraryEntry {
    book: Book;
}

export interface ListFilters {
    status?: ReadingStatus;
    limit?: number;
    offset?: number;
}

/**
 * Liste les entrées de bibliothèque de l'utilisateur courant.
 * Le client est user-scoped, donc RLS filtre automatiquement par user_id.
 */
export async function list(
    client: SupabaseClient,
    filters: ListFilters = {},
): Promise<{ entries: LibraryEntryWithBook[]; total: number }> {
    const { status, limit = 50, offset = 0 } = filters;

    let query = client
        .from('library_entries')
        .select('*, book:books(*)', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return {
        entries: (data ?? []) as LibraryEntryWithBook[],
        total: count ?? 0,
    };
}

export async function findById(
    client: SupabaseClient,
    id: string,
): Promise<LibraryEntryWithBook | null> {
    const { data, error } = await client
        .from('library_entries')
        .select('*, book:books(*)')
        .eq('id', id)
        .maybeSingle();

    if (error) throw error;
    return data as LibraryEntryWithBook | null;
}

export async function findByUserAndBook(
    client: SupabaseClient,
    userId: string,
    bookId: string,
): Promise<LibraryEntry | null> {
    const { data, error } = await client
        .from('library_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .maybeSingle();

    if (error) throw error;
    return data as LibraryEntry | null;
}

export interface CreateInput {
    user_id: string;
    book_id: string;
    status?: ReadingStatus;
}

export async function create(
    client: SupabaseClient,
    input: CreateInput,
): Promise<LibraryEntry> {
    const payload = {
        user_id: input.user_id,
        book_id: input.book_id,
        status: input.status ?? 'to_read',
        // started_at se met automatiquement quand status passe à 'reading' (cf service)
    };

    const { data, error } = await client
        .from('library_entries')
        .insert(payload)
        .select()
        .single();

    if (error) throw error;
    return data as LibraryEntry;
}

export interface UpdateInput {
    status?: ReadingStatus;
    current_page?: number;
    rating?: number | null;
    notes?: string | null;
    started_at?: string | null;
    finished_at?: string | null;
}

export async function update(
    client: SupabaseClient,
    id: string,
    input: UpdateInput,
): Promise<LibraryEntry> {
    const { data, error } = await client
        .from('library_entries')
        .update(input)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as LibraryEntry;
}

export async function remove(client: SupabaseClient, id: string): Promise<void> {
    const { error } = await client.from('library_entries').delete().eq('id', id);
    if (error) throw error;
}

export async function countByStatus(
    client: SupabaseClient,
): Promise<Record<string, number>> {
    // Postgres : group by + count
    const { data, error } = await client
        .from('library_entries')
        .select('status');

    if (error) throw error;

    const counts: Record<string, number> = {
        to_read: 0,
        reading: 0,
        read: 0,
        abandoned: 0,
    };
    for (const row of data ?? []) {
        counts[row.status] = (counts[row.status] ?? 0) + 1;
    }
    return counts;
}