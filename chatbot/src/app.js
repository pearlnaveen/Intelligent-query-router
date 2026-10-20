import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import winston from 'winston';
import chatRoutes from './routes/chatRoutes.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// Configure Winston Logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Attach logger to app
app.set('logger', logger);

// Security Middleware (Helmet)
app.use(helmet());

// CORS configuration - allow localhost, 127.0.0.1, and custom CORS_ORIGIN
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];
if (process.env.CORS_ORIGIN) {
  // Strip trailing slashes to prevent CORS mismatch issues
  allowedOrigins.push(process.env.CORS_ORIGIN.replace(/\/$/, ''));
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1):517[3-9]$/.test(origin);
    if (isLocalhost || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Parsing Middlewares
app.use(express.json({ limit: '10kb' })); // Safety: Limit body payload size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging Middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// Routes
app.use('/api', chatRoutes);

// Catch 404
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled Exception:', err);
  
  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, error: 'Malformed JSON payload' });
  }

  return res.status(500).json({
    success: false,
    error: 'An internal server error occurred'
  });
});

export default app;
export { logger };
