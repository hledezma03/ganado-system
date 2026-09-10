const express = require("express");

const router = express.Router();

const reportController = require("../controllers/reportController");

// ============================================================
// REPORTE FINANCIERO PRINCIPAL
// ============================================================

router.get("/financial", reportController.getFinancialReport);

// ============================================================
// COMPATIBILIDAD CON REPORTES ANTERIORES
// ============================================================

router.get("/financial-summary", reportController.getFinancialSummary);

router.get("/reproductive", reportController.getReproductiveReport);

router.get("/discard-candidates", reportController.getDiscardCandidates);

router.get("/performance/:id_animal", reportController.getAnimalPerformance);

module.exports = router;
