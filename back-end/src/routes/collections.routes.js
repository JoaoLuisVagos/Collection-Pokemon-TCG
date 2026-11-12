const express = require('express');
const { authenticateRequest } = require('../modules/users/auth.middleware');
const {
  addToCollection,
  getCollection,
  deleteCardCollection,
  removeOneCardCollection,
} = require('../modules/collections');

const router = express.Router();

router.use(authenticateRequest);

router.get('/', getCollection);
router.post('/', addToCollection);
router.patch('/:cardId/decrement', removeOneCardCollection);
router.delete('/:cardId', deleteCardCollection);

module.exports = router;