const { onValueUpdated } = require("firebase-functions/v2/database");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const { db, admin } = require("../config/firebase");

const FAST_WAKEUP_EVENT_ID = 7777;

// ====================================================================
// HÀM MỚI: TỰ ĐỘNG TẠO SỰ KIỆN KHI MÁY THỨC DẬY TỪ FAST STARTUP
// ====================================================================
exports.onMachineStatusChange = onValueUpdated("/status/{machineId}", async (event) => {
    // Hàm này được kích hoạt mỗi khi có thay đổi trong Realtime Database tại đường dẫn /status/{machineId}

    // Lấy dữ liệu trước và sau khi thay đổi
    const beforeStatus = event.data.before.val();
    const afterStatus = event.data.after.val();
    const { machineId } = event.params;

    // Bỏ qua nếu không có đủ dữ liệu
    if (!beforeStatus || !afterStatus) {
        return null;
    }

    // **Điều kiện quan trọng**: Chỉ chạy khi máy chuyển từ OFFLINE -> ONLINE
    if (beforeStatus.isOnline === false && afterStatus.isOnline === true) {
        logger.log(`[FastStartupDetector] Máy ${machineId} vừa chuyển từ offline sang online.`);

        // Chờ 2 phút để cho sự kiện "Khởi động" thật (nếu có) một cơ hội để đến nơi
        const twoMinutesAgo = new Date(Date.now() - 120000);

        // Truy vấn Firestore để kiểm tra xem có sự kiện "Khởi động" thật (ID 6005) nào gần đây không
        const eventsRef = db.collection("machineEvents");
        const snapshot = await eventsRef
            .where("machineId", "==", machineId)
            .where("eventId", "==", 6005) // Event ID của "Khởi động" thật
            .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(twoMinutesAgo))
            .limit(1)
            .get();

        // Nếu KHÔNG tìm thấy sự kiện thật nào...
        if (snapshot.empty) {
            // ...thì đây chính là trường hợp Fast Startup.
            logger.log(`[FastStartupDetector] Không tìm thấy sự kiện khởi động thật cho ${machineId}. Tạo sự kiện "Thức dậy nhanh".`);

            // Tạo một sự kiện "giả" với ID đặc biệt của chúng ta
            const syntheticEvent = {
                machineId: machineId,
                eventId: FAST_WAKEUP_EVENT_ID, // ID 7777
                eventMessage: "Hệ thống ghi nhận máy thức dậy từ chế độ Fast Startup.",
                // Dùng serverTimestamp để có thời gian chính xác nhất
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };

            // Ghi sự kiện này vào Firestore
            await db.collection("machineEvents").add(syntheticEvent);
            logger.log(`[FastStartupDetector] Đã tạo sự kiện "Thức dậy nhanh" cho ${machineId}.`);
        } else {
            // Nếu có sự kiện thật, không cần làm gì cả.
            logger.log(`[FastStartupDetector] Đã có sự kiện khởi động thật cho ${machineId}. Bỏ qua.`);
        }
    }

    return null;
});

exports.onEventWrite = onDocumentCreated("machineEvents/{docId}", async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { machineId, eventId, createdAt } = data;
    const firestoreRef = db.collection("machineStatus").doc(machineId);

    // Lấy tham chiếu đến Realtime Database (RTDB)
    const rtdbRef = admin.database().ref(`/status/${machineId}`);

    const update = {
        lastEventId: Number(eventId),
        lastEventAt: createdAt,
        lastSeenAt: createdAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const eventNum = Number(eventId);
    const ONLINE_EVENTS = new Set([6005, 107, 4801, 506]);
    const OFFLINE_EVENTS = new Set([6006, 6008, 1074, 42, 4800, 507, 7000, 7002]);

    if (ONLINE_EVENTS.has(eventNum)) {
        update.isOnline = true;
        if (eventNum === 6005) {
            update.lastBootAt = createdAt;
        }
    } else if (OFFLINE_EVENTS.has(eventNum)) {
        update.isOnline = false;
        update.lastShutdownAt = createdAt;
        update.lastShutdownKind =
            (eventNum === 6006 || eventNum === 1074 || eventNum === 7000 || eventNum === 7002) ? "user" :
                eventNum === 6008 ? "unexpected" :
                    (eventNum === 42 || eventNum === 4800 || eventNum === 507) ? "sleep" : // Gộp 4800 (Khóa máy) vào nhóm sleep
                        "stale";
    }

    // Luôn cập nhật trạng thái lịch sử vào Firestore
    await firestoreRef.set(update, { merge: true });

    // --- SỬA ĐỔI BẮT ĐẦU ---
    // Chủ động cập nhật trạng thái real-time trên RTDB để giao diện phản hồi ngay lập tức
    if (ONLINE_EVENTS.has(eventNum)) {
        logger.log(`Online event ${eventNum} detected for ${machineId}. Forcing ONLINE status in RTDB.`);
        await rtdbRef.set({
            isOnline: true,
            lastSeenAt: admin.database.ServerValue.TIMESTAMP
        });
    } else if (OFFLINE_EVENTS.has(eventNum)) {
        logger.log(`Offline event ${eventNum} detected for ${machineId}. Forcing OFFLINE status in RTDB.`);
        await rtdbRef.set({
            isOnline: false,
            lastSeenAt: admin.database.ServerValue.TIMESTAMP
        });
    }
    // --- SỬA ĐỔI KẾT THÚC ---
});
