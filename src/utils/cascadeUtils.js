import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { toNum } from "./numberUtils";
import { getNextQuarter } from "./quarterHelpers";
import { COL_QUARTER } from "../hooks/usePrevQuarterData";
import { db } from "../services/firebase-config";

/**
 * Sau khi lưu Q hiện tại, hàm này sẽ:
 *  • Lấy cumCurrent của tất cả khoản mục (trừ fixed) ở Q hiện tại
 *  • Lan truyền (cascade) sang các quý còn lại trong cùng năm
 *    – nếu quý sau CHƯA có document ⇒ tự khởi tạo document rỗng
 *    – tính lại carryOver, cumCurrent, cumQuarterOnly
 */
export async function cascadeUpdateAfterSave(startYear, startQuarter) {
    // —— ❶ Lấy cumCurrent của quý vừa lưu ————————————
    const srcSnap = await getDoc(
        doc(db, COL_QUARTER, `${startYear}_${startQuarter}`)
    );
    if (!srcSnap.exists()) return;

    const prevCum = {}; // id → cumCurrent
    (srcSnap.data().mainRows || []).forEach((r) => {
        if (!r.fixed) prevCum[r.id] = toNum(r.cumCurrent);
    });

    // —— ❷ Duyệt 3 quý còn lại trong năm ————————————
    let { year: y, quarter: q } = getNextQuarter(startYear, startQuarter);

    for (let step = 0; step < 3 && y === startYear; step++) {
        const key = `${y}_${q}`;
        const docRef = doc(db, COL_QUARTER, key);

        // ➊ Lấy snap (tạo mới nếu chưa tồn tại)
        let snap = await getDoc(docRef);
        if (!snap.exists()) {
            await setDoc(docRef, {
                mainRows: [], // khởi tạo rỗng
                created_at: serverTimestamp(),
            });
            snap = await getDoc(docRef);
        }

        // ➋ Tính lại các dòng
        const rows = (snap.data().mainRows || []).map((r) => {
            if (r.fixed) return r; // skip fixed

            const carry = prevCum[r.id] ?? 0;
            const used = toNum(r.used);
            const alloc = toNum(r.allocated ?? r.thiCongValue);

            return {
                ...r,
                carryOver: carry,
                cumCurrent: used - alloc + carry,
                cumQuarterOnly: used - alloc,
            };
        });

        // ➌ Ghi đè document quý sau
        await setDoc(
            docRef,
            { mainRows: rows, updated_at: serverTimestamp() },
            { merge: true }
        );

        // ➍ Chuẩn bị prevCum cho vòng tiếp theo
        Object.keys(prevCum).forEach((k) => delete prevCum[k]); // xoá key cũ
        rows.forEach((r) => {
            if (!r.fixed) prevCum[r.id] = toNum(r.cumCurrent);
        });

        // ➎ Tiếp sang quý kế
        ({ year: y, quarter: q } = getNextQuarter(y, q));
    }
}