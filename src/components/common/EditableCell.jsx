import React, { useState, useEffect } from "react";
import { TextField, Typography } from "@mui/material";
import { formatCurrency, parseNumber } from "../../utils/numberUtils";

const EditableCell = React.memo(
    ({ value, onSave, isNegative = false, isText = false }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [currentValue, setCurrentValue] = useState(
            isText ? value : formatCurrency(value)
        );

        useEffect(() => {
            setCurrentValue(isText ? value : formatCurrency(value));
        }, [value, isText]);

        const handleBlur = () => {
            setIsEditing(false);
            onSave(isText ? currentValue : parseNumber(currentValue));
        };

        const displayValue = isNegative ? -value : value;

        return isEditing ? (
            <TextField
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === "Enter" && handleBlur()}
                autoFocus
                variant="standard"
                fullWidth
                sx={{
                    "& input": {
                        textAlign: isText ? "left" : "right",
                        py: 0.5,
                        fontSize: "0.875rem",
                    },
                }}
            />
        ) : (
            <Typography
                variant="body2"
                textAlign={isText ? "left" : "right"}
                onClick={() => setIsEditing(true)}
                sx={{
                    cursor: "pointer",
                    fontWeight: 500,
                    color:
                        !isText && displayValue < 0
                            ? "error.main"
                            : "text.primary",
                    p: 0.5,
                    borderRadius: 1,
                    minHeight: "24px",
                    whiteSpace: "pre-wrap",
                    "&:hover": { bgcolor: "action.hover" },
                }}
            >
                {isText
                    ? value || <em>Nhập...</em>
                    : formatCurrency(displayValue)}
            </Typography>
        );
    }
);

export default EditableCell;
