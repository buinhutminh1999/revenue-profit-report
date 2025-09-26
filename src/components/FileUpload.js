import React from 'react';
import { Button } from '@mui/material';

const FileUpload = ({ onFileUpload }) => (
  <Button
    variant="contained"
    component="label"
    sx={{ mb: 2 }}
  >
    Tải tệp lên
    <input
      type="file"
      accept=".xlsx, .xls"
      hidden
      onChange={onFileUpload}
    />
  </Button>
);

export default FileUpload;