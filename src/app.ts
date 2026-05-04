import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { requireAuth } from './middlewares/auth.js';
import booksRouter from './modules/books/books.routes.js';
import libraryRouter from './modules/library/library.routes.js';
import shelvesRouter from './modules/shelves/shelves.routes.js';
import progressRouter from './modules/progress/progress.routes.js';
import profileRouter from './modules/profile/profile.routes.js';

export function createApp() {
    const app = express();

    // Sécurité HTTP de base (headers)
    app.use(helmet());

    // CORS — autorise uniquement le front
    app.use(
        cors({
            origin: env.CORS_ORIGIN,
            credentials: true,
        }),
    );

    // Parsing JSON (limite raisonnable pour éviter les abus)
    app.use(express.json({ limit: '100kb' }));

    // Logger HTTP — log automatique de chaque requête
    app.use(
        pinoHttp({
            logger,
            autoLogging: {
                ignore: (req) => req.url === '/health',
            },
            // En dev : log compact d'une ligne. En prod : log JSON complet pour l'observabilité
            customLogLevel: (_req, res, err) => {
                if (err || res.statusCode >= 500) return 'error';
                if (res.statusCode >= 400) return 'warn';
                return 'info';
            },
            customSuccessMessage: (req, res, responseTime) =>
                `${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`,
            customErrorMessage: (req, res, err) =>
                `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,
            // En dev, on veut juste le message custom, pas tout le détail req/res
            serializers:
                env.NODE_ENV === 'development'
                    ? {
                        req: () => undefined,
                        res: () => undefined,
                    }
                    : undefined,
        }),
    );

    // Healthcheck — utile pour Render et le monitoring
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.get('/me', requireAuth, (req, res) => {
        res.json({ user: req.user });
    });

    // ----- Routes métier -----
    app.use('/api/v1/books', booksRouter);
    app.use('/api/v1/library', libraryRouter);
    app.use('/api/v1/shelves', shelvesRouter);
    app.use('/api/v1/progress', progressRouter);
    app.use('/api/v1/profile', profileRouter);

    // 404 + error handler — TOUJOURS en dernier
    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}