import { isLate, isEarly, isTimeString } from "./timeUtils";

const WEEKDAYS = ["Chủ Nhật", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy"];

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

export function printStyledAttendance(
  rowsToPrint,
  dept,
  fromDate,
  toDate,
  includeSaturday = false,
  company = "BKXD"
) {
  if (!rowsToPrint.length) return;

  // Logic mặc định
  const logic = TIME_THRESHOLDS[company] || TIME_THRESHOLDS.BKXD;

  // Mapping tên công ty
  const COMPANY_NAMES = {
    BKXD: "CÔNG TY CPXD BÁCH KHOA",
    BKCT: "CÔNG TY BÁCH KHOA CHÂU THÀNH"
  };
  const companyName = COMPANY_NAMES[company] || "CÔNG TY CPXD BÁCH KHOA";

  const firstDate = rowsToPrint[0].Ngày;
  const lastDate = rowsToPrint[rowsToPrint.length - 1].Ngày;
  const title = `BẢNG CHẤM CÔNG TỪ ${firstDate} ĐẾN ${lastDate}`;
  const subTitle = `Bộ phận: ${dept === 'all' ? 'Tất cả' : dept}`;

  const today = new Date();
  const dateString = `Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;

  const style = `
    <style>
      @page { size: A4 landscape; margin: 15mm; }
      body { font-family: "Times New Roman", serif; color: #333; }
      
      /* Header Section */
      .header-container {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
        border-bottom: 2px solid #1a237e;
        padding-bottom: 10px;
      }
      .company-info {
        font-size: 14px;
        font-weight: bold;
        text-transform: uppercase;
        color: #1a237e;
      }
      .national-motto {
        text-align: center;
        font-size: 14px;
        font-weight: bold;
      }
      .national-motto span {
        display: block;
        font-weight: normal;
        font-style: italic;
        font-size: 13px;
        margin-top: 2px;
      }

      /* Title Section */
      h1 {
        text-align: center;
        margin: 0 0 5px 0;
        font-size: 22px;
        font-weight: 900;
        color: #1a237e;
        text-transform: uppercase;
      }
      .sub-title {
        text-align: center;
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 20px;
        color: #555;
      }

      /* Table Section */
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      th, td {
        border: 1px solid #ccc; /* Lighter border */
        padding: 6px 4px;
        text-align: center;
        font-size: 11px;
      }
      th { 
        background-color: #1a237e; 
        color: white; 
        font-weight: bold;
        font-size: 13px;
      }
      /* Zebra Striping */
      tr:nth-child(even) { background-color: #f8f9fa; }
      
      /* Status Colors */
      .late { 
        color: #000; 
        font-weight: bold; 
        text-decoration: underline;
        background-color: #e0e0e0;
      }
      .missing { color: #d32f2f; }
      
      /* Footer Section */
      .footer-container {
        margin-top: 30px;
        display: flex;
        justify-content: space-between;
        padding: 0 20px;
      }
      .signature-block {
        text-align: center;
        width: 40%;
      }
      .signature-title {
        font-weight: bold;
        font-size: 13px;
        text-transform: uppercase;
        margin-bottom: 80px;
      }
      .signature-name {
        font-weight: bold;
        font-size: 13px;
      }
      .date-placeholder {
        font-style: italic;
        font-size: 13px;
        margin-bottom: 5px;
      }
      .note { font-size: 11px; font-style: italic; color: #666; margin-top: 5px; }
    </style>
  `;

  const rowsHtml = rowsToPrint
    .map((r, i) => {
      const dateObj = parseDateString(r.Ngày);
      const weekday = WEEKDAYS[dateObj.getDay()];
      const isSat = dateObj.getDay() === 6;

      // --- LOGIC MỚI: Từ 18/11/2025, Thứ 7 làm cả ngày (cho cả 2 công ty) ---
      const effectiveDateSat = new Date(2025, 10, 18); // 18/11/2025
      const isNewRegulationSat = dateObj >= effectiveDateSat;

      // Nếu là quy định mới thì luôn hiện chiều T7 (hideSat = false).
      const hideSat = isSat && !includeSaturday && !isNewRegulationSat;

      const S2calc = r.S2 || "❌";

      let C1calc, C2calc;
      if (hideSat) {
        C1calc = C2calc = "—";
      } else {
        C1calc = r.C1 || "❌";
        C2calc = r.C2 || "❌";
      }

      const mReason = (r.morning || "").trim();
      const aReason = (r.afternoon || "").trim();

      // --- LOGIC ĐỘNG THEO NGÀY (Cập nhật cho BKXD từ 18/11/2025) ---
      let currentLogic = logic;
      if (company === 'BKXD') {
        const effectiveDate = new Date(2025, 10, 18); // 18/11/2025
        if (dateObj >= effectiveDate) {
          currentLogic = {
            ...logic,
            C1_LATE: 13 * 60 + 15, // 13:15
            C2_EARLY: 17 * 60 + 15 // 17:15
          };
        }
      }

      return `
        <tr>
          <td>${i + 1}</td>
          <td style="text-align: left; padding-left: 8px;">${r['Tên nhân viên']}</td>
          <td>${r.Ngày}</td>
          <td>${weekday}</td>

          <td class="${isTimeString(r.S1) && isLate(r.S1, currentLogic.S1_LATE) ? 'late' : ''}">
            ${r.S1 || '<span class="missing">❌</span>'}
          </td>

          <td class="${isTimeString(S2calc) && isEarly(S2calc, currentLogic.S2_EARLY) ? 'late' : ''}">
            ${S2calc === '❌' ? '<span class="missing">❌</span>' : S2calc}
          </td>

          <td style="text-align: left;">${mReason}</td>

          <td class="${!hideSat && isTimeString(C1calc) && isLate(C1calc, currentLogic.C1_LATE) ? 'late' : ''}">
            ${C1calc === '❌' ? '<span class="missing">❌</span>' : C1calc}
          </td>

          <td class="${!hideSat && isTimeString(C2calc) && isEarly(C2calc, currentLogic.C2_EARLY) ? 'late' : ''}">
            ${C2calc === '❌' ? '<span class="missing">❌</span>' : C2calc}
          </td>

          <td style="text-align: left;">${hideSat ? '—' : aReason}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <html>
      <head>
        <title>In Bảng Chấm Công</title>
        ${style}
      </head>
      <body>
        <div class="header-container">
            <div class="company-info">
                ${companyName}
            </div>
            <div class="national-motto">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                <span>Độc lập - Tự do - Hạnh phúc</span>
            </div>
        </div>

        <h1>${title}</h1>
        <div class="sub-title">${subTitle}</div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">STT</th>
              <th style="width: 150px;">Họ tên</th>
              <th style="width: 80px;">Ngày</th>
              <th style="width: 50px;">Thứ</th>
              <th style="width: 60px;">S1</th>
              <th style="width: 60px;">S2</th>
              <th>Lý do (Sáng)</th>
              <th style="width: 60px;">C1</th>
              <th style="width: 60px;">C2</th>
              <th>Lý do (Chiều)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        
        <p class="note"><strong>Ghi chú:</strong> ❌: Chưa chấm công | S1: Vào sáng | S2: Ra sáng | C1: Vào chiều | C2: Ra chiều</p>

        <div class="footer-container">
          <div class="signature-block">
            <div class="signature-title">Xác Nhận Lãnh Đạo</div>
            <!-- Space for signature -->
          </div>
          <div class="signature-block">
            <div class="date-placeholder">${dateString}</div>
            <div class="signature-title">Người Lập</div>
             <!-- Space for signature -->
          </div>
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