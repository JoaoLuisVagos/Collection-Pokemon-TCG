const express = require('express');
const { getPrices } = require('../modules/ligaPokemon');

const router = express.Router();

router.get('/', getPrices);

module.exports = router;
