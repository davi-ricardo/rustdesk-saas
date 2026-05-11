const express = require("express");
const router = express.Router();
const rustdeskController = require("../controllers/rustdesk");

const authMiddleware = (req, res, next) => {
  next();
};

router.get("/server-info", authMiddleware, rustdeskController.getServerInfo);
router.get("/devices", authMiddleware, rustdeskController.getDevices);
router.post("/alias", authMiddleware, rustdeskController.saveAlias);
router.get("/reports", authMiddleware, rustdeskController.getReports);
router.put("/reports/:id/category", authMiddleware, rustdeskController.updateLogCategory);
router.get("/reports/export/xls", authMiddleware, rustdeskController.exportXLS);

// Endpoints de compatibilidade com o RustDesk Client
router.get("/ab", rustdeskController.getAb); // Livro de endereços para o app
router.post("/login", rustdeskController.clientLogin);
router.post("/heartbeat", rustdeskController.heartbeat);
router.post("/log", rustdeskController.logConnection);
router.post("/audit", rustdeskController.logConnection); // Alias comum em algumas versões
router.post("/audit/log", rustdeskController.logConnection); // Outro alias comum
router.post("/connection", rustdeskController.logConnection);
router.post("/connection/log", rustdeskController.logConnection);
router.post("/connect", rustdeskController.logConnection);
router.post("/conn", rustdeskController.logConnection);
router.post("/conn/log", rustdeskController.logConnection);
router.post("/session", rustdeskController.logConnection);
router.post("/session/log", rustdeskController.logConnection);
router.post("/session/start", rustdeskController.logConnection);
router.post("/session/end", rustdeskController.logConnection);

module.exports = router;
