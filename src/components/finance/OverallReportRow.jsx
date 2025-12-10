import React from "react";
import { TableRow, TableCell, useTheme, alpha } from "@mui/material";
import EditableCell from "../common/EditableCell";
import ReadOnlyCell from "../common/ReadOnlyCell";
import MultiAccountSelect from "../common/MultiAccountSelect";

const OverallReportRow = ({
    stt,
    label,
    soHieuTK,
    onSaveSoHieuTK,
    dauKy,
    hienTai,
    accountsData,
    khoKhan,
    onSaveKhoKhan,
    deXuat,
    onSaveDeXuat,
    isNegative = false,
    isTotal = false,
    isSub = false,
    indent = 0,
    showAccountSelect = true,
    isDauKyEditable = false,
    onSaveDauKy,
    isHienTaiEditable = false,
    onSaveHienTai,
}) => {
    const theme = useTheme();
    const isDetailRow = !isTotal && !isSub;

    return (
        <TableRow
            sx={{
                "&:nth-of-type(odd)": {
                    backgroundColor: isDetailRow
                        ? alpha(theme.palette.action.hover, 0.4)
                        : "inherit",
                },
                backgroundColor: isTotal
                    ? alpha(theme.palette.primary.light, 0.1)
                    : isSub
                        ? alpha(theme.palette.grey[500], 0.1)
                        : "inherit",
                "& > td": {
                    fontWeight: isTotal || isSub ? 700 : "normal",
                    verticalAlign: "top",
                    color: isTotal ? "primary.main" : "inherit",
                },
            }}
        >
            <TableCell>{stt}</TableCell>
            <TableCell sx={{ minWidth: 180 }}>
                {showAccountSelect && onSaveSoHieuTK && (
                    <MultiAccountSelect
                        value={soHieuTK}
                        onChange={(e) => onSaveSoHieuTK(e.target.value)}
                        accountsData={accountsData}
                    />
                )}
            </TableCell>
            <TableCell sx={{ pl: indent * 4 }}>{label}</TableCell>
            <TableCell>
                {isDauKyEditable ? (
                    <EditableCell
                        value={dauKy}
                        onSave={onSaveDauKy}
                        isNegative={isNegative}
                    />
                ) : (
                    <ReadOnlyCell
                        value={dauKy}
                        isNegative={isNegative}
                        bold={isTotal || isSub}
                    />
                )}
            </TableCell>
            <TableCell>
                {isHienTaiEditable ? (
                    <EditableCell
                        value={hienTai}
                        onSave={onSaveHienTai}
                        isNegative={isNegative}
                    />
                ) : (
                    <ReadOnlyCell
                        value={hienTai}
                        isNegative={isNegative}
                        bold={isTotal || isSub}
                    />
                )}
            </TableCell>
            <TableCell>
                {onSaveKhoKhan ? (
                    <EditableCell
                        value={khoKhan}
                        onSave={onSaveKhoKhan}
                        isText
                    />
                ) : null}
            </TableCell>
            <TableCell>
                {onSaveDeXuat ? (
                    <EditableCell value={deXuat} onSave={onSaveDeXuat} isText />
                ) : null}
            </TableCell>
        </TableRow>
    );
};

export default OverallReportRow;
