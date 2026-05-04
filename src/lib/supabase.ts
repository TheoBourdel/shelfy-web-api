import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/**
 * Client admin avec service_role : bypass RLS.
 * À utiliser UNIQUEMENT pour opérations système (jobs, admin, webhooks).
 * NE JAMAIS exposer cette clé côté client.
 */
export const supabaseAdmin: SupabaseClient = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    },
);

/**
 * Crée un client Supabase scopé à l'utilisateur courant.
 * RLS appliqué automatiquement : auth.uid() correspondra à l'utilisateur du JWT.
 */
export function createUserClient(accessToken: string): SupabaseClient {
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });
}