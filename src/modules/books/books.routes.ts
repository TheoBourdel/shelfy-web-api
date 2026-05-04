import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import * as booksController from './books.controller.js';

const router = Router();

// Toutes les routes nécessitent une auth
router.use(requireAuth);

router.get('/search', booksController.search);
router.get('/isbn/:isbn', booksController.getByIsbn);
router.get('/:id', booksController.getById);

export default router;