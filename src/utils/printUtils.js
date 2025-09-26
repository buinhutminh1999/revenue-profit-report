import { isLate, isEarly, isTimeString } from "./timeUtils";

const WEEKDAYS = ["Chủ Nhật", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy"];

function parseDateString(str) {
  const [dd, mm, yyyy] = str.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function printStyledAttendance(
  rowsToPrint,
  dept,
  fromDate,
  toDate,
  includeSaturday = false
) {
  if (!rowsToPrint.length) return;

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
      .late { background: #FFCCCC; }
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

      // Gom và sort giờ
      const allTimes = [r.S1, r.S2, r.C1, r.C2]
        .filter(isTimeString)
        .sort((a, b) => toMinutes(a) - toMinutes(b));
      
      // Tính S2 cho mọi ngày: luôn hiển thị r.S2 nếu có, còn không thì ❌
      const S2calc = r.S2 || "❌";

      // Tính C1, C2
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

      return `
        <tr>
          <td>${i + 1}</td>
          <td>${r['Tên nhân viên']}</td>
          <td>${r.Ngày}</td>
          <td>${weekday}</td>

          <!-- S1 -->
          <td class="${isTimeString(r.S1) && isLate(r.S1, 7*60+15) ? 'late' : ''}">
            ${r.S1 || '❌'}
          </td>

          <!-- S2 -->
          <td class="${isTimeString(S2calc) && isEarly(S2calc, 11*60+15) ? 'late' : ''}">
            ${S2calc}
          </td>

          <!-- Lý do Sáng -->
          <td>${mReason}</td>

          <!-- C1 -->
          <td class="${!hideSat && isTimeString(C1calc) && isLate(C1calc, 13*60) ? 'late' : ''}">
            ${C1calc}
          </td>

          <!-- C2 -->
          <td class="${!hideSat && isTimeString(C2calc) && isEarly(C2calc, 17*60) ? 'late' : ''}">
            ${C2calc}
          </td>

          <!-- Lý do Chiều -->
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