import type { SupabaseClient } from '@supabase/supabase-js';
import { BadRequestError, NotFoundError } from '../../lib/errors.js';
import * as libraryRepo from '../library/library.repository.js';
import * as progressRepo from './progress.repository.js';
import type {
    CreateSessionInput,
    ListSessionsFilters,
    ReadingSession,
    ReadingStats,
} from './progress.repository.js';

/**
 * Logger une session de lecture.
 * Logique métier :
 * 1. Vérifie que la library_entry existe (RLS empêche d'agir sur celle d'un autre user)
 * 2. Crée la session
 * 3. Met à jour current_page sur la library_entry (= ancienne valeur + pages_read)
 * 4. Si current_page atteint page_count, propose le passage en 'read' (côté front)
 */
export async function logSession(
    client: SupabaseClient,
    input: CreateSessionInput,
): Promise<{ session: ReadingSession; new_current_page: number }> {
    const entry = await libraryRepo.findById(client, input.library_entry_id);
    if (!entry) {
        throw new NotFoundError(`Library entry ${input.library_entry_id} not found`);
    }

    // Sanity check : on ne dépasse pas la page count si on l'a
    const newCurrentPage = entry.current_page + input.pages_read;
    if (entry.book.page_count && newCurrentPage > entry.book.page_count) {
        throw new BadRequestError(
            `Cannot read ${input.pages_read} pages: would exceed book length (${entry.book.page_count})`,
        );
    }

    // Créer la session
    const session = await progressRepo.createSession(client, input);

    // Mettre à jour la page courante de la library_entry
    // Si l'user était en 'to_read', on bascule en 'reading'
    const update: Parameters<typeof libraryRepo.update>[2] = {
        current_page: newCurrentPage,
    };
    if (entry.status === 'to_read') {
        update.status = 'reading';
        update.started_at = entry.started_at ?? new Date().toISOString();
    }
    await libraryRepo.update(client, entry.id, update);

    return { session, new_current_page: newCurrentPage };
}

export async function listSessions(
    client: SupabaseClient,
    filters: ListSessionsFilters,
) {
    return progressRepo.listSessions(client, filters);
}

export async function deleteSession(
    client: SupabaseClient,
    id: string,
): Promise<void> {
    const session = await progressRepo.findSessionById(client, id);
    if (!session) throw new NotFoundError(`Session ${id} not found`);

    // On reverse : on retire les pages_read de la library_entry pour cohérence
    const entry = await libraryRepo.findById(client, session.library_entry_id);
    if (entry) {
        const newPage = Math.max(0, entry.current_page - session.pages_read);
        await libraryRepo.update(client, entry.id, { current_page: newPage });
    }

    await progressRepo.deleteSession(client, id);
}

export async function getStats(
    client: SupabaseClient,
    period: 'week' | 'month' | 'year' | 'all' = 'all',
): Promise<ReadingStats> {
    return progressRepo.getStats(client, period);
}