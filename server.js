const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Task = require('./models/Task');
const authMiddleware = require('./middleware/auth');
const { validateTask } = require('./middleware/validate');
const authRoutes = require('./routes/authRoutes');
const { sendStatusChangeEmail } = require('./utils/mailer');

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== CORS ====================
app.use(cors());
// ==================== END CORS ====================

// ==================== CONNECT TO MONGODB ====================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch((err) => console.error('MongoDB connection error:', err));
// ==================== END CONNECT TO MONGODB ====================

app.use(express.json());


// ==================== LOGGER MIDDLEWARE ====================
app.use((req, res, next) => {
  const time = new Date().toISOString();
  console.log(`${time} | ${req.method} | ${req.originalUrl} | IP: ${req.ip}`);
  next();
});
// ==================== END LOGGER MIDDLEWARE ====================


// ==================== CONTENT-TYPE MIDDLEWARE ====================
app.use((req, res, next) => {
  if (
    (req.method === 'POST' || req.method === 'PUT') &&
    !req.is('application/json')
  ) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Content-Type must be application/json'
    });
  }
  next();
});
// ==================== END CONTENT-TYPE MIDDLEWARE ====================


// ==================== AUTH ROUTES (public) ====================
app.use('/auth', authRoutes);
// ==================== END AUTH ROUTES ====================


// ==================== GET /tasks ====================
app.get('/tasks', authMiddleware, async (req, res, next) => {
  try {
    const tasks = await Task.find({ owner: req.user.id });
    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (err) {
    next(err);
  }
});
// ==================== END GET /tasks ====================


// ==================== GET /tasks/:id ====================
app.get('/tasks/:id', authMiddleware, async (req, res, next) => {
  try {
    // Catch malformed ObjectIds before hitting the DB
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid task ID format'
      });
    }

    const task = await Task.findOne({ _id: req.params.id, owner: req.user.id });

    if (!task) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Task with id ${req.params.id} not found.`
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    next(err);
  }
});
// ==================== END GET /tasks/:id ====================


// ==================== POST /tasks ====================
app.post('/tasks', authMiddleware, validateTask, async (req, res, next) => {
  try {
    const { id, title, description, completed, priority, status } = req.body;

    const task = await Task.create({ id, title, description, completed, priority, status, owner: req.user.id });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (err) {
    // Return Mongoose validation errors as structured JSON
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        error: 'Validation Error',
        messages: errors
      });
    }
    // Duplicate key error (e.g. duplicate numeric id)
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'A task with that ID already exists. Please try again.'
      });
    }
    next(err);
  }
});
// ==================== END POST /tasks ====================


// ==================== PUT /tasks/:id ====================
app.put('/tasks/:id', authMiddleware, validateTask, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid task ID format'
      });
    }

    const { title, description, completed, priority, status } = req.body;

    // Fetch the old task first so we can compare status
    const oldTask = await Task.findOne({ _id: req.params.id, owner: req.user.id });

    if (!oldTask) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Task with id ${req.params.id} not found.`
      });
    }

    const oldStatus = oldTask.status;

    // Build the update object, setting timestamps when status changes
    const updateFields = { title, description, completed, priority, status };
    if (status && status !== oldStatus) {
      if (status === 'pending') updateFields.pendingAt = new Date();
      if (status === 'completed') updateFields.completedAt = new Date();
      // moving away from completed clears completedAt
      if (oldStatus === 'completed' && status !== 'completed') updateFields.completedAt = null;
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      updateFields,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });

    // Send email notification if status changed — fire and forget, does not block response
    if (status && status !== oldStatus) {
      const User = require('./models/User');
      User.findById(req.user.id).then((user) => {
        if (user && user.email) {
          sendStatusChangeEmail(user.email, task.title, oldStatus, status)
            .catch((err) => console.error('Email send failed:', err.message));
        }
      });
    }
  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        error: 'Validation Error',
        messages: errors
      });
    }
    next(err);
  }
});
// ==================== END PUT /tasks/:id ====================


// ==================== DELETE /tasks/:id ====================
app.delete('/tasks/:id', authMiddleware, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid task ID format'
      });
    }

    const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user.id });

    if (!task) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Task with id ${req.params.id} not found.`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: task
    });
  } catch (err) {
    next(err);
  }
});
// ==================== END DELETE /tasks/:id ====================


// ==================== 404 HANDLER ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    status: 404,
    message: 'Route Not Found',
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});
// ==================== END 404 HANDLER ====================


// ==================== GLOBAL ERROR HANDLER (must stay last) ====================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong'
  });
});
// ==================== END GLOBAL ERROR HANDLER ====================


app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
