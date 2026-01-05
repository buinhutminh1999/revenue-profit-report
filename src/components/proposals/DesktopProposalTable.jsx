import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Box, keyframes
} from '@mui/material';
import ProposalTableRow from './ProposalTableRow';
import ProposalTableSkeleton from './ProposalTableSkeleton';
import EmptyProposalState from './EmptyProposalState';

// Define keyframes for slide-in animation
const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

/**
 * HeaderCell - Styled header cell cho bảng
 */
const HeaderCell = ({ children, width, align = 'left', sx = {} }) => (
    <TableCell
        sx={{
            fontWeight: 700,
            fontSize: '0.75rem',
            color: 'text.secondary',
            backgroundColor: 'transparent',
            width: width,
            borderBottom: 'none',
            ...sx
        }}
        align={align}
    >
        {children}
    </TableCell>
);

/**
 * DesktopProposalTable - Bảng danh sách proposals cho desktop
 * Được memo hóa để tránh re-render không cần thiết
 */
const DesktopProposalTable = React.memo(({
    filteredProposals,
    isLoading,
    canDoAction,
    setActionDialog,
    setEditData,
    setDialogOpen,
    setPreviewImage,
    user,
    userEmail,
    isMaintenance,
    isViceDirector,
    setCommentDialog,
    onViewDetails,
    onAdd // Passed for EmptyState
}) => {
    return (
        <TableContainer sx={{
            maxHeight: 'calc(100vh - 200px)',
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            bgcolor: 'background.paper',
            overflow: 'auto', // Changed to auto to allow scrolling
            '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
            },
            '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
                borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
                background: '#c1c1c1',
                borderRadius: '4px',
                '&:hover': {
                    background: '#a8a8a8',
                },
            },
        }}>
            <Table stickyHeader size="medium" sx={{ minWidth: 1200 }}>
                <TableHead>
                    <TableRow>
                        <HeaderCell width={100} sx={{ pl: 3, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }}>MÃ PHIẾU</HeaderCell>
                        <HeaderCell width={180}>NGƯỜI ĐỀ XUẤT</HeaderCell>
                        <HeaderCell width={300}>NỘI DUNG</HeaderCell>
                        <HeaderCell width={250}>THÔNG TIN BẢO TRÌ</HeaderCell>
                        <HeaderCell width={350}>TIẾN ĐỘ & HÀNH ĐỘNG</HeaderCell>
                        <HeaderCell width={100} align="center" sx={{ borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>CÔNG CỤ</HeaderCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {isLoading ? (
                        <ProposalTableSkeleton />
                    ) : filteredProposals.length > 0 ? (
                        filteredProposals.map((item, index) => (
                            <Box
                                component={ProposalTableRow}
                                key={item.id}
                                item={item}
                                canDoAction={canDoAction}
                                setActionDialog={setActionDialog}
                                setEditData={setEditData}
                                setDialogOpen={setDialogOpen}
                                setPreviewImage={setPreviewImage}
                                user={user}
                                userEmail={userEmail}
                                isMaintenance={isMaintenance}
                                isViceDirector={isViceDirector}
                                setCommentDialog={setCommentDialog}
                                onViewDetails={onViewDetails}
                                sx={{
                                    animation: `${slideIn} 0.3s ease-out forwards`,
                                    animationDelay: `${index * 0.05}s`, // Staggered animation
                                    opacity: 0 // Initial state handled by animation
                                }}
                            />
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} sx={{ borderBottom: 'none', py: 0 }}>
                                <EmptyProposalState onAdd={onAdd} />
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
});

DesktopProposalTable.displayName = 'DesktopProposalTable';

export default DesktopProposalTable;
