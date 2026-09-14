const express = require("express");

const router = express.Router();
const animalController = require("../controllers/animalController");

router.post("/", animalController.createAnimal);

router.get("/", animalController.getAnimals);

router.get("/:id/discharges", animalController.getAnimalDischarges);

router.get("/:id", animalController.getAnimal);

router.put("/:id", animalController.updateAnimal);

router.patch("/:id/lifecycle", animalController.updateLifecycle);

router.patch("/:id/status", animalController.updateAnimalStatus);

router.post("/:id/discharge", animalController.registerDischarge);

router.post("/sync-categories", animalController.syncCategories);

router.delete("/:id/permanent", animalController.deleteAnimalPermanent);

module.exports = router;
