import React, { useState, useMemo } from "react";
import {
    FormControl,
    Select,
    OutlinedInput,
    Box,
    Chip,
    ListSubheader,
    TextField,
    InputAdornment,
    MenuItem,
    Checkbox,
    ListItemText,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";

const MultiAccountSelect = React.memo(({ value, onChange, accountsData }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const accountCodes = accountsData
        ? Object.keys(accountsData).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true })
        )
        : [];
    const filteredAccountCodes = useMemo(
        () =>
            accountCodes.filter((code) => {
                const accountInfo = accountsData[code];
                if (!accountInfo) return false;
                const searchTermLower = searchTerm.toLowerCase();
                const nameMatch =
                    accountInfo.accountName
                        ?.toLowerCase()
                        .includes(searchTermLower) ?? false;
                const codeMatch = code.toLowerCase().includes(searchTermLower);
                return nameMatch || codeMatch;
            }),
        [searchTerm, accountCodes, accountsData]
    );
    return (
        <FormControl fullWidth size="small">
            <Select
                multiple
                value={value || []}
                onChange={onChange}
                input={
                    <OutlinedInput
                        sx={{ padding: "4px 8px", fontSize: "0.875rem" }}
                    />
                }
                renderValue={(selected) => {
                    const handleDelete = (valToDelete) => (e) => {
                        // Prevent opening the select menu
                        e.stopPropagation();
                        // Should construct new array
                        const newVal = selected.filter((v) => v !== valToDelete);
                        // Call parent onChange with event-like object
                        onChange({ target: { value: newVal } });
                    };
                    return (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {selected.map((val) => (
                                <Chip
                                    key={val}
                                    label={val}
                                    size="small"
                                    onDelete={handleDelete(val)}
                                    onMouseDown={(e) => e.stopPropagation()} // Prevent select open on click
                                />
                            ))}
                        </Box>
                    );
                }}
                MenuProps={{
                    autoFocus: false,
                    PaperProps: { style: { maxHeight: 300 } },
                }}
            >
                <ListSubheader>
                    {" "}
                    <TextField
                        size="small"
                        placeholder="Tìm kiếm..."
                        fullWidth
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                    />{" "}
                </ListSubheader>
                {filteredAccountCodes.map((code) => (
                    <MenuItem key={code} value={code}>
                        {" "}
                        <Checkbox
                            checked={(value || []).includes(code)}
                            size="small"
                        />{" "}
                        <ListItemText
                            primary={code}
                            secondary={accountsData[code]?.accountName || "N/A"}
                        />{" "}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
});

export default MultiAccountSelect;
