const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Task = require('./models/Task');
const authMiddleware = require('./middleware/auth');
const { validateTask } = require('./middleware/validate');
const authRoutes = require('./routes/authRoutes');
const { sendStatusChangeEmail } = require('./utils/mailer');
const { cache, KEYS, recordHit, recordMiss, getStats } = require('./utils/cache');
const taskEvents = require('./events/taskEvents');

// ── register all event listeners ─────────────────────────────────────────────
require('./events/taskListeners');

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
    const cacheKey = KEYS.ALL_TASKS + '_' + req.user.id;
    const cached = cache.get(cacheKey);

    if (cached) {
      recordHit();
      return res.status(200).json({
        success: true,
        count: cached.length,
        data: cached,
        fromCache: true
      });
    }

    recordMiss();
    const tasks = await Task.find({ owner: req.user.id });
    cache.set(cacheKey, tasks);

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
      fromCache: false
    });
  } catch (err) {
    next(err);
  }
});
// ==================== END GET /tasks ====================


// ==================== GET /tasks/:id ====================
app.get('/tasks/:id', authMiddleware, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid task ID format'
      });
    }

    const cacheKey = KEYS.TASK(req.params.id + '_' + req.user.id);
    const cached = cache.get(cacheKey);

    if (cached) {
      recordHit();
      return res.status(200).json({
        success: true,
        data: cached,
        fromCache: true
      });
    }

    recordMiss();
    const task = await Task.findOne({ _id: req.params.id, owner: req.user.id });

    if (!task) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Task with id ${req.params.id} not found.`
      });
    }

    cache.set(cacheKey, task);

    res.status(200).json({
      success: true,
      data: task,
      fromCache: false
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

    // Invalidate the all-tasks cache for this user
    cache.del(KEYS.ALL_TASKS + '_' + req.user.id);

    // [API] log and respond immediately — before the event handler runs
    console.log(`[API] Task created, response sent at ${new Date().toISOString()}`);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });

    // Emit event AFTER response — handler runs asynchronously and does not block
    taskEvents.emit('task-created', task);
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

    // Invalidate both the all-tasks cache and the individual task cache
    cache.del(KEYS.ALL_TASKS + '_' + req.user.id);
    cache.del(KEYS.TASK(req.params.id + '_' + req.user.id));

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

    // Invalidate both the all-tasks cache and the individual task cache
    cache.del(KEYS.ALL_TASKS + '_' + req.user.id);
    cache.del(KEYS.TASK(req.params.id + '_' + req.user.id));

    // [API] log and emit delete event after response
    console.log(`[API] Task deleted, response sent at ${new Date().toISOString()}`);
    taskEvents.emit('task-deleted', task);
  } catch (err) {
    next(err);
  }
});
// ==================== END DELETE /tasks/:id ====================


// ==================== GET /cache-stats (debug endpoint) ====================
app.get('/cache-stats', authMiddleware, (req, res) => {
  const stats = getStats();
  const total = stats.hits + stats.misses;
  res.status(200).json({
    success: true,
    data: {
      hits:       stats.hits,
      misses:     stats.misses,
      total:      total,
      hitRate:    total > 0 ? ((stats.hits / total) * 100).toFixed(1) + '%' : '0%',
      cachedKeys: stats.keys,
      keyCount:   stats.keyCount
    }
  });
});
// ==================== END GET /cache-stats ====================


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


// Export app for testing — listen is handled by index.js
module.exports = app;
