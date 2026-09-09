const express = require("express");
const router = express.Router();

const salesController = require("../controllers/salesController");

// Crear venta por lote
router.post("/batch", salesController.createSaleBatch);

// Historial
router.get("/batches", salesController.getSaleBatches);

// Detalle de una venta
router.get("/batches/:id", salesController.getSaleBatch);

// Resumen para dashboard/reportes
router.get("/summary", salesController.getSalesSummary);

module.exports = router;
