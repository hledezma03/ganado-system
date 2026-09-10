const express = require("express");
const router = express.Router();

const reproductionController = require("../controllers/reproductionController");

router.post("/birth", reproductionController.recordBirth);

router.get("/cows", reproductionController.getCowsReproduction);

router.get("/:id_vaca", reproductionController.getReproductionByAnimal);

router.post("/weaning", reproductionController.recordWeaning);

router.put("/:id", reproductionController.updateReproduction);

module.exports = router;
