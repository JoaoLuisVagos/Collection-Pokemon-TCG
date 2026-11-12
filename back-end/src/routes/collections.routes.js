const express = require('express');
const { authenticateRequest } = require('../modules/users/auth.middleware');
const { addToCollection, getCollection } = require('../modules/collections');

const router = express.Router();

router.use(authenticateRequest);

router.get('/', getCollection);
router.post('/', addToCollection);

module.exports = router;