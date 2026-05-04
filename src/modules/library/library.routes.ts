import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import * as libraryController from './library.controller.js';

const router = Router();

// Toutes les routes nécessitent une auth
router.use(requireAuth);

router.get('/', libraryController.list);
router.post('/', libraryController.addBook);
router.get('/counts', libraryController.counts);
router.get('/:id', libraryController.getById);
router.patch('/:id', libraryController.update);
router.delete('/:id', libraryController.remove);

export default router;