import { toNum } from "./numberUtils";

export function buildRows({
  projects,
  projData,
  mainRows,
  extraRows,
  getDC,
  cats,
  salaryRowId,
}) {
  // Phần header giữ nguyên
  const head = cats.map((cat) => {
    const r = { id: cat.key, label: cat.label };
    projects.forEach((p) => {
      const revQ = toNum(projData[p.id]?.overallRevenue);
      r[p.id] = cat.key === "overallRevenue" ? revQ : 0;
    });
    r.used = projects.reduce((s, p) => s + r[p.id], 0);
    r.allocated = r.used;
    r.cumCurrent = r.used;
    r.cumQuarterOnly = r.used;
    return r;
  });

  // Phần body: xử lý đặc biệt cho + Chi phí lương
  const body = extraRows.map((ex) => {
    // Với row salaryRowId: giữ nguyên ex.pct nếu đã lưu
    let pct;
    if (ex.id === salaryRowId) {
      if (typeof ex.pct === "number") {
        pct = ex.pct;
      } else if (typeof ex.pct === "string" && ex.pct.trim() !== "") {
        pct = parseFloat(ex.pct);
      } else {
        pct = 0;
      }
    } else {
      // Các mục khác: parseFloat || 0 như cũ
      pct = parseFloat(ex.pct) || 0;
    }

    const carryOver = toNum(ex.carryOver);

    // Tìm mainRows để lấy allocated gốc
    const main =
      mainRows.find((m) => m.id === ex.id) ||
      mainRows.find(
        (m) =>
          ((m.label ?? m.name) || "")
            .trim()
            .toLowerCase() === ex.label.trim().toLowerCase()
      ) ||
      {};

    const allocated = toNum(
      ex.id === salaryRowId
        ? ex.allocated           // nếu salaryRow, dùng ex.allocated
        : main.allocated ?? main.thiCongValue ?? 0
    );

    // Khởi tạo row với pct và carryOver
    const r = { id: ex.id, label: ex.label, pct, carryOver };

    // Tính giá trị cho từng project
    projects.forEach((p) => {
      const revQ = toNum(projData[p.id]?.overallRevenue);
      const dc = getDC(p.id, ex.label);
      r[p.id] = Math.round((revQ * pct) / 100 - dc);
    });

    // Các cột tổng
    r.used = projects.reduce((s, p) => s + (r[p.id] || 0), 0);
    r.allocated = allocated;
    r.cumCurrent = r.used - r.allocated + carryOver;
    r.cumQuarterOnly = r.used - r.allocated;

    return r;
  });

  // Kết hợp header và body
  return [head[0], ...body, head[1]];
}
