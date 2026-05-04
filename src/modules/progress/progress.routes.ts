import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import * as progressController from './progress.controller.js';

const router = Router();

router.use(requireAuth);

// Sessions de lecture
router.post('/sessions', progressController.logSession);
router.get('/sessions', progressController.listSessions);
router.delete('/sessions/:id', progressController.deleteSession);

// Stats agrégées
router.get('/stats', progressController.getStats);

export default router;