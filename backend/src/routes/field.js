const express = require("express");

const router = express.Router();

const fieldController = require("../controllers/fieldController");

// ============================================================
// IDENTIFICACIÓN
// ============================================================

router.get("/identification", fieldController.getIdentification);

router.patch(
  "/identification/:id_animal",
  fieldController.updateIdentification,
);

// ============================================================
// VACUNACIÓN
// ============================================================

router.get("/vaccinations", fieldController.getVaccinations);

router.get("/vaccinations/:id_animal", fieldController.getVaccinationHistory);

router.post("/vaccinations", fieldController.createVaccination);

module.exports = router;
