const {
  createUser,
  loginUser: authenticateUser,
  getUserProfile,
  updateUser,
} = require('./users.service');

function getAuthenticatedUserId(req) {
  return req.authenticatedUser?.id;
}

async function registerUser(req, res) {
  try {
    const { name, email, password } = req.body || {};
    const result = await createUser({ name, email, password });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body || {};
    const result = await authenticateUser({ email, password });

    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
}

async function getProfile(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const user = await getUserProfile(userId);

    return res.json({ user });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
}

async function updateProfile(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const { name, email, password } = req.body || {};
    const user = await updateUser(userId, { name, email, password });

    return res.json({ user });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
}

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
};