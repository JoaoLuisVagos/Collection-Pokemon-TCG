const express = require('express');
const {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
} = require('../modules/users');
const { authenticateRequest } = require('../modules/users/auth.middleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', authenticateRequest, getProfile);
router.put('/me', authenticateRequest, updateProfile);

module.exports = router;