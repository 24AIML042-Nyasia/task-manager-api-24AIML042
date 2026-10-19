const EventEmitter = require('events');

// Custom EventEmitter class for task-related events
class TaskEvents extends EventEmitter {}

// Single shared instance used across the entire app
module.exports = new TaskEvents();
