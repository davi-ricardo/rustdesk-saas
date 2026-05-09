const express = require("express");
const router = express.Router();
const userController = require("../controllers/users");
const { authenticate, adminOnly } = require("../middleware/auth");

router.get("/", authenticate, adminOnly, userController.listUsers);
router.post("/", authenticate, adminOnly, userController.createUser);
router.put("/:id", authenticate, adminOnly, userController.updateUser);
router.put("/:id/toggle", authenticate, adminOnly, userController.toggleUserStatus);

module.exports = router;
