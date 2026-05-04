import type { SupabaseClient } from '@supabase/supabase-js';

export interface Profile {
    id: string;
    display_name: string | null;
    created_at: string;
    updated_at: string;
}

export async function findById(
    client: SupabaseClient,
    id: string,
): Promise<Profile | null> {
    const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) throw error;
    return data as Profile | null;
}

export interface UpdateInput {
    display_name?: string | null;
}

export async function update(
    client: SupabaseClient,
    id: string,
    input: UpdateInput,
): Promise<Profile> {
    const { data, error } = await client
        .from('profiles')
        .update(input)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Profile;
}