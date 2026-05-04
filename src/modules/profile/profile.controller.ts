import type { Request, Response } from 'express';
import { z } from 'zod';
import { UnauthorizedError } from '../../lib/errors.js';
import * as profileService from './profile.service.js';
import { supabaseAdmin } from '../../lib/supabase.js';

const updateBodySchema = z
    .object({
        display_name: z
            .string()
            .trim()
            .min(2, 'Le nom doit faire au moins 2 caractères')
            .max(50, 'Le nom ne peut pas dépasser 50 caractères')
            .nullable()
            .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided',
    });

export async function getMe(req: Request, res: Response) {
    if (!req.supabase || !req.user) throw new UnauthorizedError();
    const profile = await profileService.getProfile(req.supabase, req.user.id);
    // On joint l'email depuis req.user (vient du JWT, c'est la source de vérité)
    res.json({ ...profile, email: req.user.email });
}

export async function updateMe(req: Request, res: Response) {
    if (!req.supabase || !req.user) throw new UnauthorizedError();
    const body = updateBodySchema.parse(req.body);
    const profile = await profileService.updateProfile(
        req.supabase,
        req.user.id,
        body,
    );
    res.json({ ...profile, email: req.user.email });
}

export async function deleteMe(req: Request, res: Response) {
    if (!req.user) throw new UnauthorizedError();

    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);

    if (error) {
        throw new Error(`Failed to delete user: ${error.message}`);
    }

    res.status(204).send();
}