const express = require("express");
const router = express.Router();
const product = require("../controller/product");
const { authenticate, requireAdmin } = require("../util/auth");

router.get("/", product.getAllProducts);
router.get("/categories", product.getProductCategories);
router.get("/category/:category", product.getProductsInCategory);
router.get("/:id", product.getProduct);
router.post("/", authenticate, requireAdmin, product.addProduct);
router.put("/:id", authenticate, requireAdmin, product.editProduct);
router.patch("/:id", authenticate, requireAdmin, product.editProduct);
router.delete("/:id", authenticate, requireAdmin, product.deleteProduct);

module.exports = router;
