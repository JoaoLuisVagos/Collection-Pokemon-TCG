const express = require('express');
const { searchCard, estimateCard, searchAndSaveCard } = require('../modules/cards');

const router = express.Router();

router.get('/search', searchCard);
router.get('/estimate', estimateCard);
router.post('/search-and-save', searchAndSaveCard);

module.exports = router;