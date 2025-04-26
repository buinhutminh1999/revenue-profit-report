// src/components/EditableRow.jsx
import React from "react";
import {
  TableRow,
  TableCell,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { formatNumber, parseNumber } from "../utils/numberUtils";
import { getHiddenColumnsForProject } from "../utils/calcUtils";

const EditableRow = ({
  row,
  columnsAll,
  columnsVisibility,
  handleChangeField,
  handleRemoveRow,
  editingCell,
  setEditingCell,
  overallRevenue,       // (chưa dùng nhưng cứ để nếu sau này cần)
  projectTotalAmount,   // (chưa dùng nhưng cứ để nếu sau này cần)
  categories,           // mảng category phải truyền vào
}) => {
  /* Những cột cần ẩn theo cấu hình project */
  const hiddenCols = getHiddenColumnsForProject(row.project);

  return (
    <TableRow
      sx={{
        "&:hover": { backgroundColor: "#f9f9f9" },
        transition: "background-color 0.3s",
      }}
    >
      {columnsAll.map((col) => {
        /* 1️⃣ Không hiển thị nếu cột đang bị tắt trong cấu hình */
        if (!columnsVisibility[col.key]) return null;

        /* 2️⃣ Ẩn cột theo quy tắc của từng project */
        if (hiddenCols.includes(col.key)) {
          return <TableCell key={col.key} align="center" sx={{ p: 1 }} />;
        }

        /* 3️⃣ Những cột chỉ đọc */
        if (
          col.key === "carryoverEnd" ||
          (row.project.includes("-CP") && col.key === "revenue") ||
          (col.key === "noPhaiTraCK" && !row.project.includes("-CP"))
        ) {
          const tooltipTitle =
            col.key === "carryoverEnd"
              ? "Chỉ đọc – Giá trị tự động"
              : row.project.includes("-CP") && col.key === "revenue"
              ? "Tự động tính (không sửa)"
              : "Chỉ đọc";
          return (
            <TableCell key={col.key} align="center">
              <Tooltip title={tooltipTitle}>
                <Typography variant="body2">
                  {formatNumber(row[col.key])}
                </Typography>
              </Tooltip>
            </TableCell>
          );
        }

        /* 4️⃣ Đang edit ô này? */
        const isEditing =
          editingCell.id === row.id && editingCell.colKey === col.key;

        /* 4a. Đang edit KHÔNG phải description → TextField chung */
        if (isEditing && col.key !== "description") {
          const isNumeric = !["project", "description"].includes(col.key);
          const val = row[col.key] ?? "";
          const parsed = parseNumber(val);
          const hasError =
            isNumeric && val !== "" && isNaN(Number(parsed));

          return (
            <TableCell key={col.key} align="center">
              <TextField
                variant="outlined"
                size="small"
                fullWidth
                value={val}
                onChange={(e) =>
                  handleChangeField(row.id, col.key, e.target.value)
                }
                onBlur={() => setEditingCell({ id: null, colKey: null })}
                autoFocus
                error={hasError}
                helperText={hasError ? "Giá trị không hợp lệ" : ""}
                sx={{ border: "1px solid #0288d1", borderRadius: 1 }}
              />
            </TableCell>
          );
        }

        /* 5️⃣ Logic riêng cho cột description */
        if (col.key === "description") {
          const isDescEditing =
            editingCell.id === row.id &&
            editingCell.colKey === "description";

          /* 5a. Project có "-CP" → dropdown */
          if (isDescEditing && row.project.includes("-CP")) {
            return (
              <TableCell key="description" align="center">
                <Select
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={row.description || ""}
                  onChange={(e) =>
                    handleChangeField(
                      row.id,
                      "description",
                      e.target.value
                    )
                  }
                  onClose={() => setEditingCell({ id: null, colKey: null })}
                  autoFocus
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.label}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </TableCell>
            );
          }

          /* 5b. Project thường → TextField */
          if (isDescEditing) {
            return (
              <TableCell key="description" align="center">
                <TextField
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={row.description || ""}
                  onChange={(e) =>
                    handleChangeField(
                      row.id,
                      "description",
                      e.target.value
                    )
                  }
                  onBlur={() => setEditingCell({ id: null, colKey: null })}
                  autoFocus
                  sx={{ border: "1px solid #0288d1", borderRadius: 1 }}
                />
              </TableCell>
            );
          }

          /* 5c. Mặc định chỉ hiển thị text */
          return (
            <TableCell key="description" align="center">
              <Typography
                variant="body2"
                sx={{ cursor: "pointer" }}
                onDoubleClick={() =>
                  setEditingCell({ id: row.id, colKey: "description" })
                }
              >
                {row.description || "Double click để nhập"}
              </Typography>
            </TableCell>
          );
        }

        /* 6️⃣ Mặc định: hiển thị value, double-click để edit (nếu được phép) */
        return (
          <TableCell key={col.key} align="center">
            <Tooltip
              title={
                col.editable ? "Double click để chỉnh sửa" : "Chỉ đọc"
              }
            >
              <Typography
                variant="body2"
                sx={{ cursor: col.editable ? "pointer" : "default" }}
                onDoubleClick={() =>
                  col.editable &&
                  setEditingCell({ id: row.id, colKey: col.key })
                }
              >
                {row[col.key]
                  ? formatNumber(row[col.key])
                  : "Double click để nhập"}
              </Typography>
            </Tooltip>
          </TableCell>
        );
      })}

      {/* 7️⃣ Nút xoá */}
      <TableCell align="center">
        <IconButton
          color="error"
          onClick={() => handleRemoveRow(row.id)}
        >
          <CloseIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
};

export default React.memo(EditableRow);
