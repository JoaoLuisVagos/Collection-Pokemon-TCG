const express = require('express');
const { authenticateRequest } = require('../modules/users/auth.middleware');
const { addToCollection, getCollection, deleteCardCollection} = require('../modules/collections');

const router = express.Router();

router.use(authenticateRequest);

router.get('/', getCollection);
router.post('/', addToCollection);
router.delete('/:cardId', deleteCardCollection);

module.exports = router;