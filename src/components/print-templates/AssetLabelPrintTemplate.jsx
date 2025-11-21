import React, { forwardRef, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";

// Component in tem được tối ưu cho khổ Tomy 130 (101x47mm)
// Thiết kế mới: Bỏ viền, bỏ mã, thêm ngày kiểm kê
export const AssetLabelPrintTemplate = forwardRef(
    ({ assetsToPrint = [], company }, ref) => {
        // Tự động lấy ngày hiện tại để in tem
        const today = new Date();
        const printDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

        // Các tham số layout cho giấy Tomy 130 (2 cột x 6 hàng)
        const LABEL_W = 101;
        const LABEL_H = 47;
        const PAGE_MARGIN_X = 4;
        const PAGE_MARGIN_Y = 7.5;
        const PER_PAGE = 12;

        const pages = useMemo(() => {
            const out = [];
            for (let i = 0; i < assetsToPrint.length; i += PER_PAGE) {
                out.push(assetsToPrint.slice(i, i + PER_PAGE));
            }
            if (out.length === 0) out.push([]);
            return out;
        }, [assetsToPrint]);

        return (
            <div ref={ref}>
                <style type="text/css">
                    {`
            @page {
              size: A4;
              margin: ${PAGE_MARGIN_Y}mm ${PAGE_MARGIN_X}mm;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .page { page-break-after: always; }
            }
            .sheet {
              display: grid;
              grid-template-columns: repeat(2, ${LABEL_W}mm);
              grid-auto-rows: ${LABEL_H}mm;
              gap: 0;
            }
            .label {
              box-sizing: border-box;
              padding: 4mm 5mm;
              display: flex;
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
              overflow: hidden;
              page-break-inside: avoid;
              /* Viền đã được xóa bỏ */
            }
            .text-col {
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding-right: 4mm;
            }
            .company-name {
              font-family: system-ui, sans-serif;
              font-size: 8pt;
              font-weight: 600;
              color: #4A5568;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .asset-name {
              font-family: system-ui, sans-serif;
              font-size: 16pt;
              font-weight: 700;
              color: #1A202C;
              line-height: 1.2;
              word-break: break-word;
              margin: auto 0;
            }
            .asset-details {
              font-family: system-ui, sans-serif;
              font-size: 8.5pt;
              color: #718096;
            }
          `}
                </style>

                {pages.map((assetsOnPage, pageIndex) => (
                    <div className="page" key={`page-${pageIndex}`}>
                        <div className="sheet">
                            {Array.from({ length: PER_PAGE }).map((_, i) => {
                                const asset = assetsOnPage[i];
                                return (
                                    <div className="label" key={`label-${pageIndex}-${i}`}>
                                        {asset ? (
                                            <>
                                                <div className="text-col">
                                                    <Typography className="company-name">
                                                        {company?.name || "CÔNG TY"}
                                                    </Typography>
                                                    <Typography className="asset-name">
                                                        {asset.name}
                                                    </Typography>
                                                    <Typography className="asset-details">
                                                        Phòng: {asset.departmentName || "-"}
                                                        <br />
                                                        Ngày Kiểm Kê: {printDate}
                                                        <br />
                                                        Mã số: <b>{asset.printIndex}/{asset.printTotal}</b>
                                                    </Typography>
                                                </div>
                                                <Box sx={{ flexShrink: 0 }}>
                                                    <QRCodeSVG
                                                        value={`${window.location.origin}/assets/${asset.id}`}
                                                        size={100}
                                                        level="H"
                                                        bgColor="#ffffff"
                                                        fgColor="#1A202C"
                                                        imageSettings={{
                                                            src: "https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png",
                                                            height: 24,
                                                            width: 24,
                                                            excavate: true,
                                                        }}
                                                    />
                                                </Box>
                                            </>
                                        ) : (
                                            <div /> // Ô trống
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    }
);