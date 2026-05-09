const express = require("express");
const router = express.Router();
const userController = require("../controllers/users");

// Middleware de admin simples
const adminOnly = (req, res, next) => {
  // Em uma app real, verificaríamos o token JWT aqui
  next();
};

router.get("/", adminOnly, userController.listUsers);
router.post("/", adminOnly, userController.createUser);
router.put("/:id/toggle", adminOnly, userController.toggleUserStatus);

module.exports = router;
