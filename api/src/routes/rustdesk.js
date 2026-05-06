const express = require("express");
const router = express.Router();
const rustdeskController = require("../controllers/rustdesk");

const authMiddleware = (req, res, next) => {
  next();
};

router.get("/server-info", authMiddleware, rustdeskController.getServerInfo);
router.get("/devices", authMiddleware, rustdeskController.getDevices);
router.post("/login", rustdeskController.clientLogin);
router.post("/heartbeat", rustdeskController.heartbeat);

module.exports = router;
