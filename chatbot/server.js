import app, { logger } from './src/app.js';
import { verifyDBConnection } from './src/config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1) Verify database connection pool on startup
    await verifyDBConnection();

    // 2) Listen on PORT
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Chatbot Service is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // Graceful Shutdown Handler
    const shutdown = () => {
      logger.info('Shutting down server gracefully...');
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start Chatbot Service:', error);
    process.exit(1);
  }
}

startServer();
