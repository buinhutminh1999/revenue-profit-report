import { isLate, isEarly, isTimeString } from "./timeUtils";

const WEEKDAYS = ["Chủ Nhật", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy"];

// --- THAY ĐỔI 1: Sao chép đối tượng logic thời gian từ AttendanceTable ---
const TIME_THRESHOLDS = {
    // Logic của Xây Dựng Bách Khoa (Mặc định)
    BKXD: {
        S1_LATE: 7 * 60 + 15,  // 07:15
        S2_EARLY: 11 * 60 + 15, // 11:15
        C1_LATE: 13 * 60,       // 13:00
        C2_EARLY: 17 * 60,      // 17:00
    },
    // Logic của Bách Khoa Châu Thành (Mới)
    BKCT: {
        S1_LATE: 7 * 60,        // 07:00
        S2_EARLY: 11 * 60,      // 11:00
        C1_LATE: 13 * 60,       // 13:00 (Như cũ)
        C2_EARLY: 17 * 60,      // 17:00 (Như cũ)
    }
};

function parseDateString(str) {
  const [dd, mm, yyyy] = str.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// --- THAY ĐỔI 2: Thêm 'company' vào tham số của hàm ---
export function printStyledAttendance(
  rowsToPrint,
  dept,
  fromDate,
  toDate,
  includeSaturday = false,
  company = "BKXD" // Thêm tham số này, mặc định là "BKXD"
) {
  if (!rowsToPrint.length) return;

  // --- THAY ĐỔI 3: Chọn logic dựa trên 'company' ---
  const logic = TIME_THRESHOLDS[company] || TIME_THRESHOLDS.BKXD;

  const firstDate = rowsToPrint[0].Ngày;
  const lastDate = rowsToPrint[rowsToPrint.length - 1].Ngày;
  const title = `Bảng công từ ngày ${firstDate} đến ngày ${lastDate} – Bộ phận: ${dept}`;

  const style = `
    <style>
      @page { size: A4 landscape; margin: 20px; }
      body { font-family: "Times New Roman", serif; }
      h1 {
        text-align: center;
        margin-bottom: 16px;
        font-size: 24px;
        font-weight: bold;
      }
      table { width: 100%; border-collapse: collapse; }
      th, td {
        border: 1px solid #000;
        padding: 6px;
        text-align: center;
        font-size: 12px;
      }
      th { background: #f2f2f2; }
      .late { background: #FFCCCC; } /* Đây là class tô màu */
      .signature { display: flex; justify-content: space-between; margin-top: 40px; }
      .signature div { width: 40%; text-align: center; }
      .signature p { font-weight: bold; margin-bottom: 60px; }
      .note { font-size: 12px; margin-top: 10px; }
    </style>
  `;

  const rowsHtml = rowsToPrint
    .map((r, i) => {
      const dateObj = parseDateString(r.Ngày);
      const weekday = WEEKDAYS[dateObj.getDay()];
      const isSat = dateObj.getDay() === 6;
      const hideSat = isSat && !includeSaturday;

      const allTimes = [r.S1, r.S2, r.C1, r.C2]
        .filter(isTimeString)
        .sort((a, b) => toMinutes(a) - toMinutes(b));
      
      const S2calc = r.S2 || "❌";

      let C1calc, C2calc;
      if (isSat) {
        if (!includeSaturday) {
          C1calc = C2calc = "—";
        } else {
          C1calc = r.C1 || "❌";
          C2calc = r.C2 || "❌";
        }
      } else {
        C1calc = r.C1 || "❌";
        C2calc = r.C2 || "❌";
      }

      const mReason = (r.morning || "").trim();
      const aReason = (r.afternoon || "").trim();

      // --- THAY ĐỔI 4: Sử dụng 'logic' động thay vì số cứng ---
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${r['Tên nhân viên']}</td>
          <td>${r.Ngày}</td>
          <td>${weekday}</td>

          <td class="${isTimeString(r.S1) && isLate(r.S1, logic.S1_LATE) ? 'late' : ''}">
            ${r.S1 || '❌'}
          </td>

          <td class="${isTimeString(S2calc) && isEarly(S2calc, logic.S2_EARLY) ? 'late' : ''}">
            ${S2calc}
          </td>

          <td>${mReason}</td>

          <td class="${!hideSat && isTimeString(C1calc) && isLate(C1calc, logic.C1_LATE) ? 'late' : ''}">
            ${C1calc}
          </td>

          <td class="${!hideSat && isTimeString(C2calc) && isEarly(C2calc, logic.C2_EARLY) ? 'late' : ''}">
            ${C2calc}
          </td>

          <td>${hideSat ? '—' : aReason}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <html>
      <head>
        <title>In bảng chấm công</title>
        ${style}
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>
              <th>STT</th><th>Tên nhân viên</th><th>Ngày</th><th>Thứ</th>
              <th>S1</th><th>S2</th><th>Lý do trễ (Sáng)</th>
              <th>C1</th><th>C2</th><th>Lý do trễ (Chiều)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <p class="note"><strong>Ghi chú:</strong> ❌: chưa chấm công | S1/S2 sáng | C1/C2 chiều</p>
        <div class="signature">
          <div><p>Xác nhận lãnh đạo</p></div>
          <div><p>Người lập</p></div>
        </div>
      </body>
    </html>
  `;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  win.onafterprint = () => win.close();
}