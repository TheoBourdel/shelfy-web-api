import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Server ready on http://localhost:${env.PORT}`);
    logger.info(`📦 Environment: ${env.NODE_ENV}`);
});

// Graceful shutdown — important en prod (Render envoie SIGTERM avant kill)
const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close((err) => {
        if (err) {
            logger.error({ err }, 'Error during shutdown');
            process.exit(1);
        }
        logger.info('Server closed');
        process.exit(0);
    });

    // Force exit après 10s si le close prend trop de temps
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Capture les erreurs non-gérées (filet de sécurité)
process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
});