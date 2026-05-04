import type { SupabaseClient } from '@supabase/supabase-js';
import type { LibraryEntryWithBook } from '../library/library.repository.js';

export interface Shelf {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    color: string | null;
    created_at: string;
    updated_at: string;
}

export interface ShelfWithCount extends Shelf {
    entries_count: number;
}

export interface ShelfWithEntries extends Shelf {
    entries: LibraryEntryWithBook[];
}

/**
 * Liste les étagères du user (RLS scope automatiquement).
 * Inclut le nombre de livres dans chaque étagère.
 */
export async function list(client: SupabaseClient): Promise<ShelfWithCount[]> {
    const { data, error } = await client
        .from('shelves')
        .select('*, entries:library_entry_shelves(count)')
        .order('name', { ascending: true });

    if (error) throw error;

    // Supabase retourne entries: [{ count: N }] avec ce pattern, on aplatit
    return (data ?? []).map((s) => ({
        ...s,
        entries_count: (s.entries as Array<{ count: number }>)[0]?.count ?? 0,
        entries: undefined, // on retire le champ brut
    })) as unknown as ShelfWithCount[];
}

export async function findById(
    client: SupabaseClient,
    id: string,
): Promise<Shelf | null> {
    const { data, error } = await client
        .from('shelves')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) throw error;
    return data as Shelf | null;
}

/**
 * Récupère une étagère avec tous les livres qu'elle contient.
 * Le triple-join (shelf → library_entry_shelves → library_entries → books) est géré par Supabase.
 */
export async function findByIdWithEntries(
    client: SupabaseClient,
    id: string,
): Promise<ShelfWithEntries | null> {
    const { data, error } = await client
        .from('shelves')
        .select(
            `
      *,
      library_entry_shelves(
        library_entry:library_entries(
          *,
          book:books(*)
        )
      )
    `,
        )
        .eq('id', id)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Aplatit la structure : on veut juste un tableau d'entries
    type Joined = {
        library_entry_shelves: Array<{ library_entry: LibraryEntryWithBook }>;
    };
    const joined = data as unknown as Shelf & Joined;
    const entries = joined.library_entry_shelves.map((j) => j.library_entry);

    const { library_entry_shelves: _ignored, ...shelf } = joined;
    return { ...shelf, entries } as ShelfWithEntries;
}

export interface CreateInput {
    user_id: string;
    name: string;
    description?: string | null;
    color?: string | null;
}

export async function create(
    client: SupabaseClient,
    input: CreateInput,
): Promise<Shelf> {
    const { data, error } = await client
        .from('shelves')
        .insert({
            user_id: input.user_id,
            name: input.name,
            description: input.description ?? null,
            color: input.color ?? null,
        })
        .select()
        .single();

    if (error) throw error;
    return data as Shelf;
}

export interface UpdateInput {
    name?: string;
    description?: string | null;
    color?: string | null;
}

export async function update(
    client: SupabaseClient,
    id: string,
    input: UpdateInput,
): Promise<Shelf> {
    const { data, error } = await client
        .from('shelves')
        .update(input)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Shelf;
}

export async function remove(client: SupabaseClient, id: string): Promise<void> {
    const { error } = await client.from('shelves').delete().eq('id', id);
    if (error) throw error;
}

/**
 * Ajoute une library_entry à une étagère (table de jointure).
 * Idempotent : si déjà présent, ne fait rien (ON CONFLICT DO NOTHING via upsert).
 */
export async function addEntry(
    client: SupabaseClient,
    shelfId: string,
    libraryEntryId: string,
): Promise<void> {
    const { error } = await client.from('library_entry_shelves').upsert(
        {
            shelf_id: shelfId,
            library_entry_id: libraryEntryId,
        },
        { ignoreDuplicates: true },
    );

    if (error) throw error;
}

export async function removeEntry(
    client: SupabaseClient,
    shelfId: string,
    libraryEntryId: string,
): Promise<void> {
    const { error } = await client
        .from('library_entry_shelves')
        .delete()
        .eq('shelf_id', shelfId)
        .eq('library_entry_id', libraryEntryId);

    if (error) throw error;
}

export async function entryExists(
    client: SupabaseClient,
    shelfId: string,
    libraryEntryId: string,
): Promise<boolean> {
    const { data, error } = await client
        .from('library_entry_shelves')
        .select('library_entry_id')
        .eq('shelf_id', shelfId)
        .eq('library_entry_id', libraryEntryId)
        .maybeSingle();

    if (error) throw error;
    return data !== null;
}