const express = require("express");

const router = express.Router();

const animalController = require("../controllers/animalController");

router.post("/", animalController.createAnimal);

router.get("/", animalController.getAnimals);

router.get("/:id", animalController.getAnimal);

router.put("/:id", animalController.updateAnimal);

// Cambiar estado manualmente
router.patch("/:id/status", animalController.updateAnimalStatus);

// Registrar baja: Muerto / Desaparecido
router.post("/:id/discharge", animalController.registerDischarge);

router.post("/sync-categories", animalController.syncCategories);

// Eliminación permanente.
// Usar únicamente para datos de prueba o registros creados por error.
router.delete("/:id/permanent", animalController.deleteAnimalPermanent);

module.exports = router;
