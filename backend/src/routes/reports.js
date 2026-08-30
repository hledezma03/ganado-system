const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/reproductive', reportController.getReproductiveReport);
router.get('/discard-candidates', reportController.getDiscardCandidates);
router.get('/financial-summary', reportController.getFinancialSummary);
router.get('/performance/:id_animal', reportController.getAnimalPerformance);

module.exports = router;