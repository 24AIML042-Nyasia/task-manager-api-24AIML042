// Validates Task creation / update inputs
const validateTask = (req, res, next) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed: Task title is required and cannot be empty.'
    });
  }
  if (title.trim().length < 3) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed: Task title must be at least 3 characters long.'
    });
  }
  next();
};

// Validates User Registration inputs
const validateRegister = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed: Email and password are required.'
    });
  }
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed: Password must be at least 6 characters long.'
    });
  }
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed: Invalid email format.'
    });
  }
  next();
};

// Validates User Login inputs
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed: Both email and password are required.'
    });
  }
  next();
};

module.exports = { validateTask, validateRegister, validateLogin };
