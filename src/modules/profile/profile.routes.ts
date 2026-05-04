import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import * as profileController from './profile.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/me', profileController.getMe);
router.patch('/me', profileController.updateMe);
router.delete('/me', profileController.deleteMe);

export default router;