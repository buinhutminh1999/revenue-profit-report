// src/components/EditableSelect.jsx
import React, { useState } from 'react';
import { Box, Autocomplete, TextField } from '@mui/material';

export default function EditableSelect({
  value,
  onChange,
  options = [],
  placeholder = '— chọn —',
  trigger = 'click',          // 'click' | 'double'
  sx = {},
}) {
  const [edit, setEdit] = useState(false);

  /* mở select */
  const openOn =
    trigger === 'double'
      ? { onDoubleClick: () => setEdit(true) }
      : { onClick: () => setEdit(true) };

  /* ----- đang chỉnh ----- */
  if (edit) {
    return (
        <Autocomplete
        autoHighlight
        openOnFocus
        blurOnSelect
        size="small"
        fullWidth
        disableClearable={false}          // nút xoá
        noOptionsText="Không tìm thấy"
        options={options}
        value={value || null}
        onChange={(_, v)=>{ if(v!=null) onChange(v); setEdit(false);} }
        onBlur={()=>setEdit(false)}
        renderInput={(params)=>
          <TextField
            {...params}
            placeholder={placeholder}
            autoFocus
            InputProps={{
              ...params.InputProps,
              endAdornment: params.InputProps.endAdornment, // giữ clear icon
            }}
          />
        }
        sx={{
          ...sx,
          '& .MuiAutocomplete-clearIndicator': { mr: 1 },
        }}
      />
      
    );
  }

  /* ----- hiển thị tĩnh ----- */
  return (
    <Box
      {...openOn}
      sx={{
        width: '100%',
        minHeight: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        p: 0.5,
        wordBreak: 'break-word',
        ...sx,
      }}
    >
      {value || <em style={{ color: '#888' }}>{placeholder}</em>}
    </Box>
  );
}
