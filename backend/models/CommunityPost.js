// models/CommunityPost.js
const mongoose = require('mongoose');

const CommunityPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
  },
  username: { // Store username for easier display without extra lookups
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500, // Limit post length
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // You could add 'likes', 'comments', 'tags' later
});

module.exports = mongoose.model('CommunityPost', CommunityPostSchema);