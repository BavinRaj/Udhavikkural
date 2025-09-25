// routes/community.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Import auth middleware
const CommunityPost = require('../models/CommunityPost'); // Import CommunityPost model
const User = require('../models/User'); // To get username from userId
const { check, validationResult } = require('express-validator');

// @route   GET api/community/posts
// @desc    Get all community posts
// @access  Private
router.get('/posts', auth, async (req, res) => {
  try {
    const posts = await CommunityPost.find()
      .sort({ createdAt: -1 }); // Sort by newest first
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/community/posts
// @desc    Create a new community post
// @access  Private
router.post('/posts', [
  auth,
  [
    check('content', 'Post content is required').not().isEmpty(),
    check('content', 'Post content cannot exceed 500 characters').isLength({ max: 500 })
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { content } = req.body;

  try {
    const user = await User.findById(req.user.id).select('username'); // Get username from DB
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const newPost = new CommunityPost({
      userId: req.user.id,
      username: user.username, // Use the username from the fetched user
      content,
    });

    const post = await newPost.save();
    res.json(post); // Return the newly created post
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/community/posts/:post_id
// @desc    Delete a community post (only by owner)
// @access  Private
router.delete('/posts/:post_id', auth, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.post_id);

    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    // Check if user owns the post
    if (post.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await post.deleteOne(); // Use deleteOne() or findByIdAndDelete()
    res.json({ msg: 'Post removed' });
  } catch (err) {
    console.error(err.message);
    // If ID is not a valid ObjectId, it will throw a CastError
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;