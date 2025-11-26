# 🔥 Phân Tích Chi Phí Firebase - Báo Cáo Chi Tiết

## 📊 Tổng Quan
Chi phí Firebase tăng từ vài trăm - 2.000 VNĐ lên **7.000 VNĐ** trong tháng này. Đây là dấu hiệu của việc sử dụng tài nguyên quá mức.

---

## 🚨 CÁC VẤN ĐỀ NGHIÊM TRỌNG NHẤT

### 1. ⚠️ **collectionGroup Query - VẤN ĐỀ LỚN NHẤT**
**File:** `src/components/ConstructionPlan/ConstructionPlan.jsx` (dòng 533)

```javascript
const quartersQuery = collectionGroup(db, "quarters");
const unsubQuarters = onSnapshot(quartersQuery, ...);
```

**Vấn đề:**
- `collectionGroup` quét **TOÀN BỘ database** để tìm tất cả collection "quarters" trong mọi project
- Mỗi lần listener chạy, nó đọc **TẤT CẢ** documents trong tất cả subcollections "quarters"
- Nếu có 10 projects, mỗi project có 4 năm × 4 quý = 160 documents → **1.600 reads mỗi lần snapshot**
- Listener này chạy **realtime**, mỗi khi có thay đổi bất kỳ đâu → hàng nghìn reads

**Tác động:** 🔴 **RẤT CAO** - Đây là nguyên nhân chính gây tăng chi phí

**Giải pháp:**
- Thay vì dùng `collectionGroup`, chỉ lắng nghe quarters của projects hiện có
- Hoặc dùng `getDocs` một lần khi cần, không dùng realtime listener cho toàn bộ
- Hoặc lưu trạng thái finalized vào document project chính, không cần quét tất cả quarters

---

### 2. ⚠️ **Nested Listeners trong PlanningTab**
**File:** `src/components/tabs/PlanningTab.jsx` (dòng 1183-1198)

```javascript
newItems.forEach((item) => {
    const adjQuery = query(
        collection(db, "projects", projectId, "planningItems", item.id, "adjustments"),
        orderBy("createdAt", "desc")
    );
    const unsubscribeAdjustments = onSnapshot(adjQuery, ...);
    adjustmentUnsubscribes.current.set(item.id, unsubscribeAdjustments);
});
```

**Vấn đề:**
- Tạo **một listener riêng cho mỗi planningItem** để lắng nghe adjustments
- Nếu có 50 planningItems → 50 listeners chạy đồng thời
- Mỗi listener đọc toàn bộ adjustments của item đó
- Khi có thay đổi bất kỳ, tất cả listeners đều trigger

**Tác động:** 🟠 **CAO** - Tạo ra nhiều listeners không cần thiết

**Giải pháp:**
- Chỉ tạo listener khi user mở rộng (expand) item đó
- Hoặc dùng `getDocs` khi cần, không dùng realtime listener cho tất cả
- Hoặc lưu tổng adjustments vào planningItem document, không cần listener riêng

---

### 3. ⚠️ **getDocs trong Projects Listener**
**File:** `src/components/ConstructionPlan/ConstructionPlan.jsx` (dòng 376-402)

```javascript
const unsub = onSnapshot(q, async (projectsSnapshot) => {
    const projectsWithTotals = await Promise.all(
        projectsData.map(async (project) => {
            const planningItemsRef = collection(...);
            const planningSnapshot = await getDocs(planningItemsRef); // ❌
            // Tính totalHSKH
        })
    );
});
```

**Vấn đề:**
- Mỗi khi projects thay đổi, listener chạy và gọi `getDocs` cho **TẤT CẢ projects**
- Nếu có 20 projects → 20 lần gọi `getDocs` mỗi khi có thay đổi
- Điều này xảy ra **mỗi khi có bất kỳ thay đổi nào** trong projects collection

**Tác động:** 🟠 **CAO** - Tạo ra nhiều reads không cần thiết

**Giải pháp:**
- Lưu `totalHSKH` vào document project chính, tính toán khi cần
- Hoặc dùng Cloud Function để tính và cập nhật tự động
- Hoặc chỉ tính khi thực sự cần (lazy loading)

---

### 4. ⚠️ **Multiple Listeners cho Projects**
**File:** `src/hooks/useProjectData.js` (dòng 29-63)

```javascript
const unsubscribes = projects.map((p) => {
    const ref = doc(db, 'projects', p.id, 'years', String(year), 'quarters', quarter);
    return onSnapshot(ref, (snap) => { ... });
});
```

**Vấn đề:**
- Tạo listener cho **mỗi project** trong mảng
- Nếu có 20 projects → 20 listeners chạy đồng thời
- Mỗi listener lắng nghe một document cụ thể

**Tác động:** 🟡 **TRUNG BÌNH** - Có thể tối ưu nhưng không quá nghiêm trọng

**Giải pháp:**
- Chỉ tạo listener cho projects đang được hiển thị
- Hoặc dùng pagination/virtual scrolling để giảm số lượng listeners

---

## 📈 Ước Tính Chi Phí

### Trước khi tối ưu:
- **collectionGroup listener:** ~1.600 reads/lần × nhiều lần/ngày = **~50.000 reads/tháng**
- **Nested adjustments listeners:** ~50 items × 10 reads/item = **~500 reads/lần × nhiều lần = ~15.000 reads/tháng**
- **getDocs trong projects listener:** ~20 projects × 10 reads/project = **~200 reads/lần × nhiều lần = ~6.000 reads/tháng**
- **useProjectData listeners:** ~20 listeners × 5 reads/listener = **~100 reads/lần × nhiều lần = ~3.000 reads/tháng**

**Tổng:** ~74.000 reads/tháng

### Sau khi tối ưu:
- **collectionGroup:** Loại bỏ → **0 reads**
- **Nested listeners:** Chỉ load khi cần → **~2.000 reads/tháng**
- **getDocs trong listener:** Lưu vào document → **~500 reads/tháng**
- **useProjectData:** Giữ nguyên hoặc tối ưu → **~3.000 reads/tháng**

**Tổng:** ~5.500 reads/tháng (**Giảm ~93%**)

---

## ✅ KHUYẾN NGHỊ ƯU TIÊN

### Ưu tiên 1 (NGAY LẬP TỨC):
1. **Sửa collectionGroup query** - Đây là vấn đề lớn nhất
2. **Loại bỏ getDocs trong projects listener**

### Ưu tiên 2 (SỚM):
3. **Tối ưu nested listeners** trong PlanningTab
4. **Thêm pagination** cho các danh sách lớn

### Ưu tiên 3 (SAU):
5. **Tối ưu useProjectData** listeners
6. **Thêm caching** cho dữ liệu ít thay đổi

---

## 🔧 CÁC GIẢI PHÁP CỤ THỂ

### Giải pháp 1: Thay collectionGroup bằng cách khác
```javascript
// ❌ TRƯỚC (tốn tài nguyên):
const quartersQuery = collectionGroup(db, "quarters");
const unsubQuarters = onSnapshot(quartersQuery, ...);

// ✅ SAU (tối ưu):
// Option 1: Lưu finalizedQuarters vào project document
const projectRef = doc(db, "projects", projectId);
const unsub = onSnapshot(projectRef, (snap) => {
    const finalizedQuarters = snap.data()?.finalizedQuarters || [];
    // Cập nhật UI
});

// Option 2: Chỉ load khi cần (không dùng realtime)
const loadFinalizedQuarters = async (projectId) => {
    const yearsRef = collection(db, "projects", projectId, "years");
    const yearsSnapshot = await getDocs(yearsRef);
    // Chỉ load khi user mở project
};
```

### Giải pháp 2: Lazy load adjustments
```javascript
// ❌ TRƯỚC (tạo listener cho tất cả):
newItems.forEach((item) => {
    const adjQuery = query(...);
    const unsubscribeAdjustments = onSnapshot(adjQuery, ...);
});

// ✅ SAU (chỉ load khi expand):
const handleToggleRow = async (itemId) => {
    if (!expandedRows.has(itemId)) {
        // Chỉ load khi user mở rộng
        const adjQuery = query(...);
        const snapshot = await getDocs(adjQuery);
        setAdjustmentsData(prev => ({
            ...prev,
            [itemId]: snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        }));
    }
    // Toggle expanded state
};
```

### Giải pháp 3: Lưu tổng hợp vào document
```javascript
// ❌ TRƯỚC (tính mỗi lần):
const planningSnapshot = await getDocs(planningItemsRef);
const totalHSKH = planningSnapshot.docs.reduce(...);

// ✅ SAU (lưu vào document):
// Khi planningItems thay đổi, cập nhật totalHSKH vào project document
await updateDoc(doc(db, "projects", projectId), {
    totalHSKH: calculatedTotal
});

// Khi load projects, chỉ cần đọc từ document
const totalHSKH = projectData.totalHSKH || 0;
```

---

## 📝 CHECKLIST TỐI ƯU

- [ ] Sửa collectionGroup query trong ConstructionPlan.jsx
- [ ] Loại bỏ getDocs trong projects listener
- [ ] Chuyển nested listeners sang lazy loading
- [ ] Lưu tổng hợp (totalHSKH, finalizedQuarters) vào project document
- [ ] Thêm pagination cho danh sách lớn
- [ ] Kiểm tra và đóng các listeners không cần thiết
- [ ] Thêm error handling cho các queries
- [ ] Monitor Firebase usage sau khi tối ưu

---

## 🎯 KẾT LUẬN

Vấn đề chính là **collectionGroup query** đang quét toàn bộ database. Sau khi sửa, chi phí sẽ giảm đáng kể (ước tính giảm ~90%).

**Hành động ngay:** Sửa collectionGroup query là ưu tiên số 1!



