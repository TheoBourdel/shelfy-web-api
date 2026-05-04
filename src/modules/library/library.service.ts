import type { SupabaseClient } from '@supabase/supabase-js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import * as booksService from '../books/books.service.js';
import * as libraryRepo from './library.repository.js';
import type {
    LibraryEntry,
    LibraryEntryWithBook,
    ListFilters,
    ReadingStatus,
    UpdateInput,
} from './library.repository.js';

export async function listForUser(
    client: SupabaseClient,
    filters: ListFilters,
): Promise<{ entries: LibraryEntryWithBook[]; total: number }> {
    return libraryRepo.list(client, filters);
}

export async function getById(
    client: SupabaseClient,
    id: string,
): Promise<LibraryEntryWithBook> {
    const entry = await libraryRepo.findById(client, id);
    if (!entry) throw new NotFoundError(`Library entry ${id} not found`);
    return entry;
}

export interface AddBookInput {
    isbn: string;
    status?: ReadingStatus;
}

/**
 * Ajoute un livre à la bibliothèque de l'utilisateur.
 * Orchestration : récupère/cache le livre via le module books, puis crée l'entrée.
 */
export async function addBook(
    client: SupabaseClient,
    userId: string,
    input: AddBookInput,
): Promise<LibraryEntryWithBook> {
    // 1. Récupère le livre (cache local ou ISBNdb)
    const book = await booksService.getOrFetchByIsbn(client, input.isbn);

    // 2. Vérifie qu'il n'est pas déjà dans la bibliothèque
    // (la contrainte unique de la DB le ferait aussi, mais on retourne une erreur claire)
    const existing = await libraryRepo.findByUserAndBook(client, userId, book.id);
    if (existing) {
        throw new ConflictError('This book is already in your library');
    }

    // 3. Crée l'entrée
    const entry = await libraryRepo.create(client, {
        user_id: userId,
        book_id: book.id,
        status: input.status,
    });

    return { ...entry, book };
}

/**
 * Met à jour une entrée. Gère intelligemment les transitions de statut :
 * - status → 'reading' : met started_at si pas déjà set
 * - status → 'read' : met finished_at + current_page = page_count si dispo
 */
export async function updateEntry(
    client: SupabaseClient,
    id: string,
    input: UpdateInput,
): Promise<LibraryEntryWithBook> {
    const existing = await libraryRepo.findById(client, id);
    if (!existing) throw new NotFoundError(`Library entry ${id} not found`);

    const patch: UpdateInput = { ...input };

    // Auto-fill des dates selon le statut
    if (input.status === 'reading' && !existing.started_at) {
        patch.started_at = new Date().toISOString();
    }
    if (input.status === 'read' && !existing.finished_at) {
        patch.finished_at = new Date().toISOString();
        // Auto-complète current_page au max si on a la page count
        if (existing.book.page_count && existing.current_page < existing.book.page_count) {
            patch.current_page = existing.book.page_count;
        }
    }

    await libraryRepo.update(client, id, patch);

    // On re-fetch avec le book joint pour la réponse
    const updated = await libraryRepo.findById(client, id);
    if (!updated) throw new NotFoundError(`Library entry ${id} not found`);
    return updated;
}

export async function removeEntry(
    client: SupabaseClient,
    id: string,
): Promise<void> {
    // RLS empêche déjà de supprimer celle d'un autre user, mais on vérifie pour avoir une 404 claire
    const existing = await libraryRepo.findById(client, id);
    if (!existing) throw new NotFoundError(`Library entry ${id} not found`);

    await libraryRepo.remove(client, id);
}

export async function findEntry(
    client: SupabaseClient,
    id: string,
): Promise<LibraryEntry | null> {
    return libraryRepo.findById(client, id);
}

export async function countByStatusForUser(
    client: SupabaseClient,
): Promise<Record<string, number>> {
    return libraryRepo.countByStatus(client);
}