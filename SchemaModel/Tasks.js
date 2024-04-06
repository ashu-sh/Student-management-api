const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaskSchema = new Schema({
    description: { type: String, required: true },
    dueTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "overdue"],
      default: "pending",
    },
    assignedTo: { type: String, ref: "User" },
});

module.exports = mongoose.model('Task', TaskSchema);