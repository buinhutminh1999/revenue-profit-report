const { setGlobalOptions } = require("firebase-functions/v2");

setGlobalOptions({
    region: "asia-southeast1",
    cpu: "gcf_gen1",
    secrets: ["GMAIL_SMTP_USER", "GMAIL_SMTP_APP_PASSWORD", "BK_INGEST_SECRET"],
});


// Export Triggers
exports.onMachineStatusChange = require("./src/triggers/machineTriggers").onMachineStatusChange;
exports.onEventWrite = require("./src/triggers/machineTriggers").onEventWrite;
exports.logAssetCreation = require("./src/triggers/logTriggers").logAssetCreation;
exports.logAssetDeletion = require("./src/triggers/logTriggers").logAssetDeletion;
exports.logTransferCreation = require("./src/triggers/logTriggers").logTransferCreation;
exports.logTransferDeletion = require("./src/triggers/logTriggers").logTransferDeletion;
exports.logTransferSignature = require("./src/triggers/logTriggers").logTransferSignature;
exports.logReportCreation = require("./src/triggers/logTriggers").logReportCreation;
exports.logReportDeletion = require("./src/triggers/logTriggers").logReportDeletion;
exports.logReportSignature = require("./src/triggers/logTriggers").logReportSignature;
exports.onTransferCompleted = require("./src/triggers/updateTriggers").onTransferCompleted;
exports.onRepairProposalWrite = require("./src/triggers/repairProposalTriggers").onRepairProposalWrite;

// Export Controllers
exports.setUserRole = require("./src/controllers/userController").setUserRole;
exports.deleteUserByUid = require("./src/controllers/userController").deleteUserByUid;
exports.inviteUser = require("./src/controllers/userController").inviteUser;
exports.sendPasswordResetEmail = require("./src/controllers/userController").sendPasswordResetEmail;

exports.manualCloseQuarter = require("./src/controllers/assetController").manualCloseQuarter;
exports.createAssetRequest = require("./src/controllers/assetController").createAssetRequest;
exports.processAssetRequest = require("./src/controllers/assetController").processAssetRequest;
exports.deleteAssetRequest = require("./src/controllers/assetController").deleteAssetRequest;
exports.batchAddAssetsDirectly = require("./src/controllers/assetController").batchAddAssetsDirectly;
exports.batchUpdateAssetDates = require("./src/controllers/assetController").batchUpdateAssetDates;

exports.createTransfer = require("./src/controllers/transferController").createTransfer;

exports.createInventoryReport = require("./src/controllers/reportController").createInventoryReport;
exports.deleteInventoryReport = require("./src/controllers/reportController").deleteInventoryReport;

exports.ingestEvent = require("./src/controllers/agentController").ingestEvent;
exports.getComputerUsageStats = require("./src/controllers/agentController").getComputerUsageStats;
exports.cronMarkStaleOffline = require("./src/controllers/agentController").cronMarkStaleOffline;
