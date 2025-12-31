const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { sendPushToUsers } = require("../utils/sendPushNotification");

const db = admin.firestore();

// Helper to get User IDs by array of emails
const getUserIdsByEmails = async (emails) => {
    if (!emails || emails.length === 0) return [];

    // Filter out empty/null values and remove duplicates
    const uniqueEmails = [...new Set(emails.filter(Boolean))];
    if (uniqueEmails.length === 0) return [];

    const userIds = [];

    // Loop through emails to find user IDs
    // We do this serially or in parallel. Since the number of roles is small (1-5), parallel Promise.all is fine.
    try {
        const promises = uniqueEmails.map(email =>
            db.collection("users").where("email", "==", email).limit(1).get()
        );

        const snapshots = await Promise.all(promises);

        snapshots.forEach(snap => {
            if (!snap.empty) {
                userIds.push(snap.docs[0].id);
            }
        });
    } catch (error) {
        console.error("Error fetching user IDs by emails:", error);
    }

    return userIds;
};

exports.onRepairProposalWrite = functions.firestore
    .document("repairProposals/{proposalId}")
    .onWrite(async (change, context) => {
        const after = change.after.exists ? change.after.data() : null;
        const before = change.before.exists ? change.before.data() : null;

        if (!after) return; // Ignore deletions for now

        // Get Role Config to know who is Maintenance and Vice Director
        let maintenanceEmail = "";
        let viceDirectorEmail = "";

        try {
            const configDoc = await db.doc("settings/repairProposalRoles").get();
            const config = configDoc.data() || {};
            maintenanceEmail = config.maintenance;
            viceDirectorEmail = config.viceDirector;
        } catch (error) {
            console.error("Error fetching role config:", error);
        }

        const notifications = [];

        // 1. New Proposal Created
        if (!before && after) {
            const userIds = await getUserIdsByEmails([maintenanceEmail]);
            if (userIds.length > 0) {
                notifications.push({
                    userIds,
                    title: "Đề xuất sửa chữa mới",
                    body: `${after.code || "Mới"} - ${after.proposer}: ${after.content}`,
                    data: { url: `/operations/repair-proposal?id=${context.params.proposalId}` }
                });
            }
        }

        // 2. Proposal Updated
        if (before && after) {
            // A. Check Approval Status Changes
            const oldStatus = before.approval?.status;
            const newStatus = after.approval?.status;

            if (oldStatus !== newStatus) {
                if (newStatus === 'approved') {
                    // Notify Proposer + Maintenance
                    // If Proposer is the one who approved (unlikely), don't notify them? 
                    // But here P.GD approves.
                    const recipients = [after.proposerEmail, maintenanceEmail];
                    const userIds = await getUserIdsByEmails(recipients);

                    if (userIds.length > 0) {
                        notifications.push({
                            userIds,
                            title: "Đề xuất đã được duyệt",
                            body: `P.GĐ đã duyệt đề xuất ${after.code}. Vui lòng tiến hành.`,
                            data: { url: `/operations/repair-proposal?id=${context.params.proposalId}` }
                        });
                    }
                } else if (newStatus === 'rejected') {
                    // Notify Proposer
                    const userIds = await getUserIdsByEmails([after.proposerEmail]);
                    if (userIds.length > 0) {
                        notifications.push({
                            userIds,
                            title: "Đề xuất bị từ chối",
                            body: `P.GĐ từ chối đề xuất ${after.code}: ${after.approval?.comment}`,
                            data: { url: `/operations/repair-proposal?id=${context.params.proposalId}` }
                        });
                    }
                }
            }

            // B. Check Maintenance Opinion Update (Waiting for Approval)
            // Logic: Maintenance opinion was empty, now has value.
            if (!before.maintenanceOpinion && after.maintenanceOpinion) {
                const userIds = await getUserIdsByEmails([viceDirectorEmail]);
                if (userIds.length > 0) {
                    notifications.push({
                        userIds,
                        title: "Cần phê duyệt đề xuất",
                        body: `Tổ bảo trì đã cập nhật ý kiến cho ${after.code}. Vui lòng phê duyệt.`,
                        data: { url: `/operations/repair-proposal?id=${context.params.proposalId}` }
                    });
                }
            }

            // C. Check Maintenance Confirmed (Waiting for Acceptance)
            const oldMaintConfirm = before.confirmations?.maintenance?.confirmed || (before.confirmations?.maintenance === true);
            const newMaintConfirm = after.confirmations?.maintenance?.confirmed || (after.confirmations?.maintenance === true);

            // Check if it transitioned to Confirmed
            // Note: Data structure is object { confirmed: true, ... } now
            const isMaintConfirmedNow = !!(after.confirmations?.maintenance?.confirmed);
            const wasMaintConfirmed = !!(before.confirmations?.maintenance?.confirmed);

            if (!wasMaintConfirmed && isMaintConfirmedNow) {
                const userIds = await getUserIdsByEmails([after.proposerEmail]);
                if (userIds.length > 0) {
                    notifications.push({
                        userIds,
                        title: "Bảo trì hoàn tất",
                        body: `Tổ bảo trì đã xử lý xong ${after.code}. Vui lòng nghiệm thu.`,
                        data: { url: `/operations/repair-proposal?id=${context.params.proposalId}` }
                    });
                }
            }

            // D. Check Rework Request (Maintenance Confirmed -> Null)
            // If it was confirmed, and now it is NOT confirmed, AND there is a lastReworkRequest that is NEW
            if (wasMaintConfirmed && !isMaintConfirmedNow && after.lastReworkRequest) {
                // Check if rework request actually changed or is just persisting
                const oldReworkTime = before.lastReworkRequest?.time;
                const newReworkTime = after.lastReworkRequest?.time;

                // If time changed (timestamp strictly greater) or it didn't exist
                // Firestore timestamps are objects. compare ToMillis() or similar.
                // Simplest is generic check: !oldReworkTime || (newReworkTime > oldReworkTime)
                // But simply checking transition from Confirmed -> Not Confirmed is enough signal.

                const userIds = await getUserIdsByEmails([maintenanceEmail]);
                if (userIds.length > 0) {
                    notifications.push({
                        userIds,
                        title: "Yêu cầu làm lại",
                        body: `Người đề xuất yêu cầu làm lại ${after.code}: ${after.lastReworkRequest.comment}`,
                        data: { url: `/operations/repair-proposal?id=${context.params.proposalId}` }
                    });
                }
            }

            // E. Check Proposer Confirmed (Waiting for Final Close)
            const isProposerConfirmedNow = !!(after.confirmations?.proposer?.confirmed);
            const wasProposerConfirmed = !!(before.confirmations?.proposer?.confirmed);

            if (!wasProposerConfirmed && isProposerConfirmedNow) {
                const userIds = await getUserIdsByEmails([viceDirectorEmail]);
                if (userIds.length > 0) {
                    notifications.push({
                        userIds,
                        title: "Chờ hoàn tất phiếu",
                        body: `Đề xuất ${after.code} đã được nghiệm thu. Vui lòng xác nhận hoàn tất.`,
                        data: { url: `/operations/repair-proposal?id=${context.params.proposalId}` }
                    });
                }
            }
        }

        // Send all collected notifications
        for (const notif of notifications) {
            await sendPushToUsers(notif.userIds, {
                title: notif.title,
                body: notif.body
            }, notif.data);
        }
    });
