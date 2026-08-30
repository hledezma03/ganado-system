const express = require('express');
const router = express.Router();
const weightController = require('../controllers/weightController');

router.post('/', weightController.recordWeight);
router.get('/:id_animal', weightController.getWeightHistory);

module.exports = router;