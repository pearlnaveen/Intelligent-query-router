import express from 'express';
import { handleAuthenticatedChatQuery } from '../controllers/nlpRouter.js';
import { extractUserContext } from '../middleware/authMiddleware.js';
import { validateChatRequest } from '../middleware/validation.js';
import { chatLimiter, apiLimiter } from '../middleware/rateLimiter.js';
import pool from '../config/db.js';

const router = express.Router();

// POST /api/chat - Authenticated DB-driven chatbot
router.post('/chat', apiLimiter, chatLimiter, validateChatRequest, extractUserContext, handleAuthenticatedChatQuery);

// GET /api/health - Health check endpoint
router.get('/health', apiLimiter, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as alive');
    const dbAlive = rows[0]?.alive === 1;

    return res.json({
      module: 'chatbotlogin',
      status: 'healthy',
      databaseMode: 'read-only',
      database: dbAlive ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health Check Failed:', error);
    return res.status(500).json({
      module: 'chatbotlogin',
      status: 'unhealthy',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
