import type { RequestHandler } from 'express';
import { UnauthorizedError } from '../lib/errors.js';
import { createUserClient, supabaseAdmin } from '../lib/supabase.js';

/**
 * Middleware qui vérifie le JWT Supabase et injecte :
 * - req.user : { id, email }
 * - req.supabase : client Supabase scopé à l'utilisateur (RLS actif)
 * - req.accessToken : le JWT brut (utile pour appels Supabase Storage par ex.)
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice('Bearer '.length).trim();

    if (!token) {
        throw new UnauthorizedError('Empty access token');
    }

    // On utilise supabaseAdmin.auth.getUser(token) qui :
    // 1. Vérifie la signature du JWT
    // 2. Vérifie l'expiration
    // 3. Récupère les infos user fraîches depuis Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
        throw new UnauthorizedError('Invalid or expired token');
    }

    req.user = {
        id: data.user.id,
        email: data.user.email ?? null,
    };
    req.accessToken = token;
    req.supabase = createUserClient(token);

    next();
};