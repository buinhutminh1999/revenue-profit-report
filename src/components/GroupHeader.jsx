import React, { memo } from 'react';
import { TableRow, TableCell } from '@mui/material';

// ---------- GroupHeader Component ----------
const GroupHeader = memo(({ projectName, colSpan }) => (
    <TableRow
    sx={{
        backgroundColor: "#e8f4fd",
        "&:hover": { backgroundColor: "#d8ecfc" },
        transition: "background-color 0.3s",
    }}
>
    <TableCell
        align="center"
        sx={{
            fontWeight: "bold",
            p: 1,
            borderBottom: "1px solid #ccc",
            color: "#0288d1",
        }}
    >
        {projectName}
    </TableCell>
    <TableCell
        colSpan={colSpan - 1}
        sx={{ p: 1, borderBottom: "1px solid #ccc" }}
    />
    <TableCell sx={{ p: 1, borderBottom: "1px solid #ccc" }} />
</TableRow>
));

export default GroupHeader;
