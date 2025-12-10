import React from "react";
import { Typography } from "@mui/material";
import { formatCurrency } from "../../utils/numberUtils";

const ReadOnlyCell = React.memo(
    ({ value, isNegative = false, bold = false }) => {
        const displayValue = isNegative ? -value : value;
        return (
            <Typography
                variant="body2"
                textAlign="right"
                sx={{
                    fontWeight: bold ? "bold" : 500,
                    color: displayValue < 0 ? "error.main" : "text.primary",
                    p: 0.5,
                }}
            >
                {" "}
                {formatCurrency(displayValue)}{" "}
            </Typography>
        );
    }
);

export default ReadOnlyCell;
