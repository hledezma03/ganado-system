const express = require("express");

const router = express.Router();

const salesController = require("../controllers/salesController");

router.post("/batch", salesController.createSaleBatch);

router.get("/batches", salesController.getSaleBatches);

router.get("/batches/:id", salesController.getSaleBatch);

module.exports = router;
