const {
  addCardToCollection,
  listUserCollection,
} = require('./collections.service');

async function addToCollection(req, res) {
  try {
    const result = await addCardToCollection(req.authenticatedUser.id, req.body || {});

    return res.status(201).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
}

async function getCollection(req, res) {
  try {
    const result = await listUserCollection(req.authenticatedUser.id, req.query || {});

    return res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
}

module.exports = {
  addToCollection,
  getCollection,
};