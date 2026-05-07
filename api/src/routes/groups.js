const express = require("express");
const router = express.Router();
const groupController = require("../controllers/groups");

// Middleware de auth (reutilizando lógica simples por enquanto)
const authMiddleware = (req, res, next) => next();

router.get("/", authMiddleware, groupController.listGroups);
router.post("/", authMiddleware, groupController.createGroup);
router.put("/:id", authMiddleware, groupController.updateGroup);
router.delete("/:id", authMiddleware, groupController.deleteGroup);

module.exports = router;
