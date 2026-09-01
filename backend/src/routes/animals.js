const express = require('express');

const router = express.Router();

const animalController = require('../controllers/animalController');

router.post('/', animalController.createAnimal);

router.get('/', animalController.getAnimals);

router.get('/:id', animalController.getAnimal);

router.put('/:id', animalController.updateAnimal);

router.post(
  '/sync-categories',
  animalController.syncCategories
);

router.delete('/:id', animalController.deleteAnimal);

module.exports = router;