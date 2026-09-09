const express = require("express");

const router = express.Router();

const purchaseController = require("../controllers/purchaseController");

// Crear compra
router.post("/", purchaseController.createPurchase);

// Historial de compras
router.get("/", purchaseController.getPurchases);

// Compra de un animal específico
router.get("/:id_animal", purchaseController.getPurchaseByAnimal);

// Actualizar compra
router.put("/:id", purchaseController.updatePurchase);

// Eliminar compra
router.delete("/:id", purchaseController.deletePurchase);

module.exports = router;
