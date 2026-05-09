const express = require("express");
const router = express.Router();
const serviceCategoriesController = require("../controllers/serviceCategories");
const { authenticate, adminOnly } = require("../middleware/auth");

router.get("/", authenticate, adminOnly, serviceCategoriesController.listCategories);
router.post("/", authenticate, adminOnly, serviceCategoriesController.createCategory);
router.put("/:id", authenticate, adminOnly, serviceCategoriesController.updateCategory);
router.delete("/:id", authenticate, adminOnly, serviceCategoriesController.deleteCategory);

module.exports = router;
