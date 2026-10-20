import express from 'express';
import { handleChatQuery } from '../controllers/nlpRouter.js';
import { validateChatRequest } from '../middleware/validation.js';
import { chatLimiter, apiLimiter } from '../middleware/rateLimiter.js';
import pool from '../config/db.js';

const router = express.Router();

// POST /api/chat - Validated, Rate limited, routed
router.post('/chat', apiLimiter, chatLimiter, validateChatRequest, handleChatQuery);

// GET /api/health - Health check endpoint
router.get('/health', apiLimiter, async (req, res) => {
  try {
    // Check DB status
    const [rows] = await pool.query('SELECT 1 as alive');
    const dbAlive = rows[0]?.alive === 1;

    return res.json({
      status: 'healthy',
      database: dbAlive ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health Check Failed:', error);
    return res.status(500).json({
      status: 'unhealthy',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
// POST/GET /api/seed-placements - Seed placement database endpoint
router.all('/seed-placements', apiLimiter, async (req, res) => {
  try {
    const { seed } = await import('../../scripts/seedPlacements.js');
    await seed();
    return res.json({
      success: true,
      message: 'Placement data seeded successfully into production database!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Placement Seeding Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to seed placement database',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;