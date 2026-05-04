import type { SupabaseClient } from '@supabase/supabase-js';

export interface ReadingSession {
    id: string;
    library_entry_id: string;
    pages_read: number;
    duration_minutes: number | null;
    logged_at: string;
    created_at: string;
}

export interface CreateSessionInput {
    library_entry_id: string;
    pages_read: number;
    duration_minutes?: number;
    logged_at?: string;
}

export async function createSession(
    client: SupabaseClient,
    input: CreateSessionInput,
): Promise<ReadingSession> {
    const { data, error } = await client
        .from('reading_sessions')
        .insert({
            library_entry_id: input.library_entry_id,
            pages_read: input.pages_read,
            duration_minutes: input.duration_minutes ?? null,
            logged_at: input.logged_at ?? new Date().toISOString(),
        })
        .select()
        .single();

    if (error) throw error;
    return data as ReadingSession;
}

export interface ListSessionsFilters {
    library_entry_id?: string;
    limit?: number;
    offset?: number;
}

export async function listSessions(
    client: SupabaseClient,
    filters: ListSessionsFilters = {},
): Promise<{ sessions: ReadingSession[]; total: number }> {
    const { library_entry_id, limit = 50, offset = 0 } = filters;

    let query = client
        .from('reading_sessions')
        .select('*', { count: 'exact' })
        .order('logged_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (library_entry_id) {
        query = query.eq('library_entry_id', library_entry_id);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return {
        sessions: (data ?? []) as ReadingSession[],
        total: count ?? 0,
    };
}

export async function findSessionById(
    client: SupabaseClient,
    id: string,
): Promise<ReadingSession | null> {
    const { data, error } = await client
        .from('reading_sessions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) throw error;
    return data as ReadingSession | null;
}

export async function deleteSession(
    client: SupabaseClient,
    id: string,
): Promise<void> {
    const { error } = await client.from('reading_sessions').delete().eq('id', id);
    if (error) throw error;
}

export interface ReadingStats {
    period: string;
    total_pages: number;
    total_minutes: number;
    sessions_count: number;
    avg_pages_per_session: number;
    books_finished: number;
    books_in_progress: number;
    books_to_read: number;
}

/**
 * Appelle la fonction Postgres get_user_reading_stats.
 * RLS appliqué automatiquement via auth.uid() côté DB.
 */
export async function getStats(
    client: SupabaseClient,
    period: 'week' | 'month' | 'year' | 'all' = 'all',
): Promise<ReadingStats> {
    const { data, error } = await client.rpc('get_user_reading_stats', {
        p_period: period,
    });

    if (error) throw error;
    return data as ReadingStats;
}