import Joi from 'joi';

/**
 * Joi Schema for POST /api/chat
 */
const chatSchema = Joi.object({
  message: Joi.string()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.base': 'Message must be a string',
      'string.empty': 'Message cannot be empty',
      'string.min': 'Message must be at least 1 character long',
      'string.max': 'Message cannot exceed 500 characters',
      'any.required': 'Message is a required field'
    }),
  sessionId: Joi.string()
    .allow(null, '')
    .max(100)
    .messages({
      'string.base': 'Session ID must be a string',
      'string.max': 'Session ID cannot exceed 100 characters'
    }),
  avatar: Joi.string()
    .allow(null, '')
    .max(50)
    .messages({
      'string.base': 'Avatar must be a string'
    }),
  language: Joi.string()
    .allow(null, '')
    .max(10)
    .messages({
      'string.base': 'Language must be a string'
    }),
  user: Joi.any().optional()
}).unknown(true);

/**
 * Middleware to validate chat request body
 */
export const validateChatRequest = (req, res, next) => {
  const { error, value } = chatSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorDetails = error.details.map(d => d.message).join(', ');
    return res.status(400).json({
      success: false,
      error: errorDetails
    });
  }

  // Replace req.body with validated and sanitized values
  req.body = value;
  next();
};
