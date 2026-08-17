const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
   id: {
    type: Number,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: [true, 'Task Title is required to proceed.'],
    minlength: [3, 'Task Title must be atleast 3 characters']
  },
  description: {
    type: String
  },
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Supplementary: priority field restricted to an enum
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: 'Priority must be one of: low, medium, high, {VALUE} is not a priority level.'
    },
    default: 'medium'
  }
});

// Supplementary: pre-save hook, trims whitespace from title
taskSchema.pre('save', async function () {
  if (this.title) {
    this.title = this.title.trim();
  }
});

// Also trim on findByIdAndUpdate / findOneAndUpdate
taskSchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate();
  if (update && update.title) {
    update.title = update.title.trim();
  }
});

module.exports = mongoose.model('Task', taskSchema);
