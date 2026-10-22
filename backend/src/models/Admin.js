const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin'],
    default: 'admin',
    required: true
  },
  tokenVersion: {
    type: Number,
    default: 0
  },
  passwordChangeRequired: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
