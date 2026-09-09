const express = require("express");

const router = express.Router();

const purchaseController = require("../controllers/purchaseController");

// Crear compra por lote
router.post("/batch", purchaseController.createPurchaseBatch);

// Historial de compras por lote
router.get("/batches", purchaseController.getPurchaseBatches);

// Detalle de un lote
router.get("/batches/:id", purchaseController.getPurchaseBatch);

// Compras individuales / compatibilidad
router.post("/", purchaseController.createPurchase);
router.get("/", purchaseController.getPurchases);
router.get("/animal/:id_animal", purchaseController.getPurchaseByAnimal);

router.put("/:id", purchaseController.updatePurchase);
router.delete("/:id", purchaseController.deletePurchase);

module.exports = router;
