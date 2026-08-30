const express = require('express');
const router = express.Router();
const reproductionController = require('../controllers/reproductionController');

router.post('/', reproductionController.recordReproduction);
router.post('/birth', reproductionController.recordBirth);
router.post('/weaning', reproductionController.recordWeaning);
router.get('/:id_vaca', reproductionController.getReproductionByAnimal);
router.put('/:id', reproductionController.updateReproduction);

module.exports = router;