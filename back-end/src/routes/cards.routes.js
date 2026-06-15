const express = require('express');
const { searchCard, searchAndSaveCard } = require('../modules/cards');

const router = express.Router();

router.get('/search', searchCard);

router.post('/search-and-save', searchAndSaveCard);

module.exports = router;