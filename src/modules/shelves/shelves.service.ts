import type { SupabaseClient } from '@supabase/supabase-js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import * as shelvesRepo from './shelves.repository.js';
import type {
    CreateInput,
    Shelf,
    ShelfWithCount,
    ShelfWithEntries,
    UpdateInput,
} from './shelves.repository.js';

export async function listForUser(
    client: SupabaseClient,
): Promise<ShelfWithCount[]> {
    return shelvesRepo.list(client);
}

export async function getByIdWithEntries(
    client: SupabaseClient,
    id: string,
): Promise<ShelfWithEntries> {
    const shelf = await shelvesRepo.findByIdWithEntries(client, id);
    if (!shelf) throw new NotFoundError(`Shelf ${id} not found`);
    return shelf;
}

export async function createShelf(
    client: SupabaseClient,
    userId: string,
    input: Omit<CreateInput, 'user_id'>,
): Promise<Shelf> {
    // La contrainte unique (user_id, name) côté DB préviendra les doublons.
    // On catch l'erreur Postgres pour retourner un 409 propre.
    try {
        return await shelvesRepo.create(client, { ...input, user_id: userId });
    } catch (err) {
        if (isUniqueViolation(err)) {
            throw new ConflictError('A shelf with this name already exists');
        }
        throw err;
    }
}

export async function updateShelf(
    client: SupabaseClient,
    id: string,
    input: UpdateInput,
): Promise<Shelf> {
    const existing = await shelvesRepo.findById(client, id);
    if (!existing) throw new NotFoundError(`Shelf ${id} not found`);

    try {
        return await shelvesRepo.update(client, id, input);
    } catch (err) {
        if (isUniqueViolation(err)) {
            throw new ConflictError('A shelf with this name already exists');
        }
        throw err;
    }
}

export async function deleteShelf(
    client: SupabaseClient,
    id: string,
): Promise<void> {
    const existing = await shelvesRepo.findById(client, id);
    if (!existing) throw new NotFoundError(`Shelf ${id} not found`);
    await shelvesRepo.remove(client, id);
}

export async function addEntryToShelf(
    client: SupabaseClient,
    shelfId: string,
    libraryEntryId: string,
): Promise<void> {
    // Vérification explicite pour avoir un 404 clair plutôt qu'une erreur RLS opaque
    const shelf = await shelvesRepo.findById(client, shelfId);
    if (!shelf) throw new NotFoundError(`Shelf ${shelfId} not found`);

    // Note : la policy library_entry_shelves_insert vérifie déjà que l'entry
    // appartient au user. Si pas le cas, l'upsert va lever une erreur RLS.
    await shelvesRepo.addEntry(client, shelfId, libraryEntryId);
}

export async function removeEntryFromShelf(
    client: SupabaseClient,
    shelfId: string,
    libraryEntryId: string,
): Promise<void> {
    const shelf = await shelvesRepo.findById(client, shelfId);
    if (!shelf) throw new NotFoundError(`Shelf ${shelfId} not found`);

    const exists = await shelvesRepo.entryExists(client, shelfId, libraryEntryId);
    if (!exists) {
        throw new NotFoundError('This entry is not in the shelf');
    }

    await shelvesRepo.removeEntry(client, shelfId, libraryEntryId);
}

/**
 * Détecte une violation de contrainte unique Postgres (code 23505).
 * Supabase remonte ces erreurs avec ce code dans `code`.
 */
function isUniqueViolation(err: unknown): boolean {
    return (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === '23505'
    );
}