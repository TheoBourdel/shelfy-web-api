import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import * as shelvesController from './shelves.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', shelvesController.list);
router.post('/', shelvesController.create);
router.get('/:id', shelvesController.getById);
router.patch('/:id', shelvesController.update);
router.delete('/:id', shelvesController.remove);

// Gestion des entries dans une étagère
router.post('/:id/entries', shelvesController.addEntry);
router.delete('/:id/entries/:entryId', shelvesController.removeEntry);

export default router;