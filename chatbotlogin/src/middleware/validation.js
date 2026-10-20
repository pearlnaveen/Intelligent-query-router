export const validateChatRequest = (req, res, next) => {
  const { message } = req.body;

  if (message === undefined || message === null) {
    return res.status(400).json({
      success: false,
      error: 'Message field is missing in request payload.'
    });
  }

  if (typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Message must be a text string.'
    });
  }

  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Message cannot be empty.'
    });
  }

  if (trimmed.length > 500) {
    return res.status(400).json({
      success: false,
      error: 'Message length exceeds maximum limit of 500 characters.'
    });
  }

  req.body.message = trimmed;
  next();
};
