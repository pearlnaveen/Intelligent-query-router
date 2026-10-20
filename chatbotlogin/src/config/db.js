import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'erp',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  connectTimeout: 30000,
  ssl: process.env.DB_SSL === 'true' ? {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false
  } : undefined
};

console.log('Initializing read-only database connection pool for chatbotlogin...');
const pool = mysql.createPool(dbConfig);

/**
 * Strict Read-Only Query Guard
 * Enforces SELECT-only execution. Rejects INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, etc.
 */
export const queryReadOnly = async (sql, params = []) => {
  const trimmed = sql.trim().toUpperCase();
  const allowedPrefixes = ['SELECT', 'WITH', 'SHOW', 'EXPLAIN'];
  const isAllowed = allowedPrefixes.some(prefix => trimmed.startsWith(prefix));

  if (!isAllowed) {
    throw new Error(`SECURITY ERROR: Read-only module. Non-SELECT query rejected: "${sql.slice(0, 50)}..."`);
  }

  return await pool.query(sql, params);
};

export const verifyDBConnection = async (retries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connection = await pool.getConnection();
      console.log('✅ ChatbotLogin database pool connected successfully (Read-Only Mode).');
      connection.release();
      return true;
    } catch (error) {
      console.error(`❌ ChatbotLogin DB connection attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
};

export default pool;
