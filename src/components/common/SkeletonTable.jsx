import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  Box,
} from '@mui/material';

/**
 * SkeletonTable Component - Hiển thị skeleton loading cho tables
 * 
 * @param {number} rows - Số dòng skeleton
 * @param {number} columns - Số cột skeleton
 * @param {boolean} showHeader - Hiển thị header skeleton
 * @param {array} columnWidths - Mảng độ rộng các cột (optional)
 */
export default function SkeletonTable({
  rows = 5,
  columns = 4,
  showHeader = true,
  columnWidths = [],
}) {
  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <Table>
        {showHeader && (
          <TableHead>
            <TableRow>
              {[...Array(columns)].map((_, index) => (
                <TableCell key={index}>
                  <Skeleton
                    width={columnWidths[index] || '80%'}
                    height={24}
                    sx={{ mx: 'auto' }}
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {[...Array(rows)].map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {[...Array(columns)].map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton
                    width={columnWidths[colIndex] || Math.random() > 0.5 ? '80%' : '60%'}
                    height={20}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * SkeletonCard Component - Hiển thị skeleton loading cho cards
 */
export function SkeletonCard({ height = 200 }) {
  return (
    <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
      <Skeleton variant="rectangular" width="100%" height={height} sx={{ mb: 2, borderRadius: 1 }} />
      <Skeleton width="60%" height={24} sx={{ mb: 1 }} />
      <Skeleton width="40%" height={20} />
    </Paper>
  );
}

/**
 * SkeletonDataGrid Component - Hiển thị skeleton loading cho DataGrid
 */
export function SkeletonDataGrid({ rows = 5, columns = 4 }) {
  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.neutral',
        }}
      >
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} width={120} height={24} />
        ))}
      </Box>
      {/* Rows */}
      {[...Array(rows)].map((_, rowIndex) => (
        <Box
          key={rowIndex}
          sx={{
            display: 'flex',
            gap: 2,
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          {[...Array(columns)].map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              width={Math.random() > 0.5 ? '80%' : '60%'}
              height={20}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}

