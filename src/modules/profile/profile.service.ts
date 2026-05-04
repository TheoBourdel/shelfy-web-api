import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError } from '../../lib/errors.js';
import * as profileRepo from './profile.repository.js';
import type { Profile, UpdateInput } from './profile.repository.js';

export async function getProfile(
    client: SupabaseClient,
    userId: string,
): Promise<Profile> {
    const profile = await profileRepo.findById(client, userId);
    if (!profile) {
        throw new NotFoundError('Profile not found');
    }
    return profile;
}

export async function updateProfile(
    client: SupabaseClient,
    userId: string,
    input: UpdateInput,
): Promise<Profile> {
    return profileRepo.update(client, userId, input);
}