const taskEvents = require('./taskEvents');

// ── task-created listener ─────────────────────────────────────────────────────
taskEvents.on('task-created', (task) => {
  // Artificial delay via setTimeout to demonstrate that this handler runs
  // AFTER the API response has already been sent back to the client.
  // The 500ms delay makes the async ordering clearly visible in the console.
  setTimeout(() => {
    console.log('--------------------------------------------------');
    console.log('[Notification] task-created event received');
    console.log(`  Title     : ${task.title}`);
    console.log(`  Task ID   : ${task._id}`);
    console.log(`  Owner     : ${task.owner}`);
    console.log(`  Status    : ${task.status}`);
    console.log(`  Timestamp : ${new Date().toISOString()}`);
    console.log('--------------------------------------------------');
  }, 500);
});

// ── task-deleted listener ─────────────────────────────────────────────────────
taskEvents.on('task-deleted', (task) => {
  setTimeout(() => {
    console.log('--------------------------------------------------');
    console.log('[Notification] task-deleted event received');
    console.log(`  Title     : ${task.title}`);
    console.log(`  Task ID   : ${task._id}`);
    console.log(`  Owner     : ${task.owner}`);
    console.log(`  Timestamp : ${new Date().toISOString()}`);
    console.log('--------------------------------------------------');
  }, 500);
});

// ── error listener ────────────────────────────────────────────────────────────
// Without this, any error thrown inside a listener crashes the process.
taskEvents.on('error', (err) => {
  console.error('[TaskEvents] Error caught by error listener:', err.message);
});
