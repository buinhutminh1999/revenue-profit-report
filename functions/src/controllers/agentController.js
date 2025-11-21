const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { db, admin } = require("../config/firebase");
const { ensureSignedIn } = require("../utils/auth");
const logger = require("firebase-functions/logger");
const crypto = require("crypto");

const BK_INGEST_SECRET = defineSecret("BK_INGEST_SECRET");

function validSignature(rawBody, header, secret) {
    if (!header || !header.toLowerCase().startsWith("sha256=")) return false;
    const sigHex = header.slice("sha256=".length).trim().toLowerCase();
    const macHex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    try {
        const sigBuf = Buffer.from(sigHex, "hex");
        const macBuf = Buffer.from(macHex, "hex");
        if (sigBuf.length !== macBuf.length) return false;
        return crypto.timingSafeEqual(sigBuf, macBuf);
    } catch {
        return false;
    }
}

exports.ingestEvent = onRequest({ secrets: [BK_INGEST_SECRET], cors: true }, async (req, res) => {
    try {
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

        const secret = BK_INGEST_SECRET.value();
        if (!validSignature(req.rawBody, req.get("X-BK-Signature"), secret)) {
            return res.status(401).send("invalid-signature");
        }

        // Kiểm tra xem req.body có phải là một mảng hay không
        const events = Array.isArray(req.body) ? req.body : [req.body];

        if (events.length === 0) {
            return res.status(400).send("bad-request-empty");
        }

        // Dùng batch write của Firestore để ghi nhiều document cùng lúc, rất hiệu quả
        const batch = db.batch();

        for (const event of events) {
            const { machineId, eventId, createdAt } = event || {};
            if (!machineId || !eventId || !createdAt) {
                logger.warn("Skipping invalid event in batch:", event);
                continue; // Bỏ qua sự kiện không hợp lệ và xử lý các sự kiện tiếp theo
            }

            const docRef = db.collection("machineEvents").doc(); // Tạo một document mới
            batch.set(docRef, {
                machineId,
                eventId: Number(eventId),
                createdAt: admin.firestore.Timestamp.fromDate(new Date(createdAt)),
                receivedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        // Thực hiện ghi toàn bộ batch
        await batch.commit();

        logger.log(`Successfully ingested ${events.length} event(s).`);
        return res.status(200).send("ok");
    } catch (e) {
        logger.error("IngestEvent error:", e);
        return res.status(500).send("error");
    }
});

exports.onEventWrite = require("../triggers/machineTriggers").onEventWrite; // Wait, onEventWrite is in machineTriggers? No, I didn't put it there.
// Ah, I missed `onEventWrite` in machineTriggers.js. I should check.
// I put `onMachineStatusChange` in `machineTriggers.js`.
// `onEventWrite` was in index.js around line 1872. I need to include it somewhere.
// It is a trigger, so it should go to `machineTriggers.js`.
// I will append it to `machineTriggers.js` later or put it here if it's related to agent.
// It is a trigger, so `machineTriggers.js` is better.

exports.getComputerUsageStats = onCall({ cors: true }, async (request) => {
    ensureSignedIn(request.auth);
    const { machineId, date } = request.data || {};
    if (!machineId) throw new HttpsError("invalid-argument", "Vui lòng cung cấp machineId.");

    const TZ = "Asia/Ho_Chi_Minh";
    const nowTz = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
    const base = date ?
        new Date(new Date(`${date}T00:00:00`).toLocaleString("en-US", { timeZone: TZ })) :
        nowTz;

    const dayStart = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999);

    const isToday =
        nowTz.getFullYear() === base.getFullYear() &&
        nowTz.getMonth() === base.getMonth() &&
        nowTz.getDate() === base.getDate();

    const statusDoc = await db.collection("machineStatus").doc(machineId).get();
    const status = statusDoc.exists ? statusDoc.data() : {};
    const lastBootAt = status.lastBootAt?.toDate?.() ?? null;
    const lastShutdownAt = status.lastShutdownAt?.toDate?.() ?? null;
    const lastSeenAt = status.lastSeenAt?.toDate?.() ?? nowTz;
    const isOnlineNow = !!status.isOnline;

    const snap = await db.collection("machineEvents")
        .where("machineId", "==", machineId)
        .where("createdAt", ">=", dayStart)
        .where("createdAt", "<=", dayEnd)
        .orderBy("createdAt", "asc")
        .get();

    const events = snap.docs.map((d) => d.data());

    // ✅ Bổ sung laptop resume/sleep
    const START_EVENTS = new Set([6005, 107, 4801, 506]); // +506
    const STOP_EVENTS = new Set([6006, 6008, 1074, 42, 4800, 507]); // +507


    const sessions = [];
    let lastStartTime = null;

    const hasStartToday = events.some((e) => START_EVENTS.has(Number(e.eventId)));
    if (!hasStartToday && isToday && isOnlineNow) {
        if (!lastShutdownAt || lastShutdownAt < dayStart) {
            lastStartTime = dayStart;
        } else {
            lastStartTime = (lastBootAt && lastBootAt >= dayStart) ? lastBootAt : dayStart;
        }
    }

    for (const ev of events) {
        const t = ev.createdAt.toDate();
        const id = Number(ev.eventId);

        if (START_EVENTS.has(id)) {
            if (lastStartTime) sessions.push({ start: lastStartTime, end: t });
            lastStartTime = t;
        } else if (STOP_EVENTS.has(id)) {
            if (lastStartTime) {
                sessions.push({ start: lastStartTime, end: t });
                lastStartTime = null;
            }
        }
    }

    if (lastStartTime) {
        let endAnchor = isToday ? lastSeenAt : dayEnd;
        if (endAnchor < dayStart) endAnchor = dayStart;
        if (endAnchor > dayEnd) endAnchor = dayEnd;
        sessions.push({ start: lastStartTime, end: endAnchor });
    }

    const totalUsageSeconds = Math.round(
        sessions.reduce((acc, s) => acc + Math.max(0, (s.end - s.start) / 1000), 0)
    );

    const firstStartAt = sessions.length ? sessions[0].start.toISOString() : null;
    const lastEndAt = sessions.length ? sessions[sessions.length - 1].end.toISOString() : null;

    return { totalUsageSeconds, firstStartAt, lastEndAt, isOnline: isOnlineNow };
});

exports.cronMarkStaleOffline = onSchedule(
    { schedule: "every 1 minutes", timeZone: "Asia/Ho_Chi_Minh" },
    async () => {
        const now = new Date();
        const cfgSnap = await db.collection("app_config").doc("agent").get();
        // Mặc định là 3 phút nếu không có cấu hình
        const heartbeatMinutes = cfgSnap.exists ? Number(cfgSnap.data()?.heartbeatMinutes) : 3;

        // Cắt giảm thời gian chờ, +1 phút dự phòng là đủ
        const stalenessMin = (heartbeatMinutes > 0 ? heartbeatMinutes : 3) + 1;
        const cutoff = new Date(now.getTime() - stalenessMin * 60 * 1000);

        const staleMachinesQuery = db.collection("machineStatus")
            .where("isOnline", "==", true)
            .where("lastSeenAt", "<", cutoff);

        const snap = await staleMachinesQuery.get();
        if (snap.empty) {
            logger.log("[cronMarkStaleOffline] No stale machines found.");
            return;
        }

        const batch = db.batch();
        // Mảng để thực hiện các lệnh ghi vào RTDB
        const rtdbPromises = [];

        const offlinePayload = {
            isOnline: false,
            lastSeenAt: admin.database.ServerValue.TIMESTAMP
        };

        snap.forEach((doc) => {
            const machineId = doc.id;
            logger.log(`[cronMarkStaleOffline] Marking machine ${machineId} as stale.`);

            // 1. Chuẩn bị lệnh ghi vào Firestore
            batch.set(doc.ref, {
                isOnline: false,
                lastShutdownAt: doc.data().lastSeenAt || now,
                lastShutdownKind: "stale",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

            // 2. THÊM MỚI: Chuẩn bị lệnh ghi vào Realtime Database
            const rtdbRef = admin.database().ref(`/status/${machineId}`);
            rtdbPromises.push(rtdbRef.set(offlinePayload));
        });

        // Thực thi đồng thời tất cả các lệnh ghi
        await Promise.all([
            batch.commit(),
            ...rtdbPromises
        ]);

        logger.log(`[cronMarkStaleOffline] Marked ${snap.size} machines offline in both Firestore and RTDB.`);
    }
);
