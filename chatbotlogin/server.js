import app, { logger } from './src/app.js';
import { verifyDBConnection } from './src/config/db.js';

const PORT = process.env.PORT || 5002;

const startServer = async () => {
  try {
    console.log('🔄 Initializing ChatbotLogin Server (Read-Only Mode)...');
    await verifyDBConnection();

    app.listen(PORT, () => {
      logger.info(`=================================================`);
      logger.info(`🚀 ChatbotLogin Server running on port ${PORT}`);
      logger.info(`🔒 Mode: Authenticated DB-driven Assistant (Read-Only)`);
      logger.info(`🌐 URL: http://localhost:${PORT}`);
      logger.info(`=================================================`);
    });
  } catch (error) {
    logger.error('❌ Failed to start ChatbotLogin server:', error);
    process.exit(1);
  }
};

startServer();
