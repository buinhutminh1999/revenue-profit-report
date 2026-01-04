import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography
} from '@mui/material';
import ProposalTableRow from './ProposalTableRow';

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
    onViewDetails
}) => {
    return (
        <TableContainer sx={{
            maxHeight: 'calc(100vh - 200px)',
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            bgcolor: 'background.paper',
            overflow: 'hidden' // Important for rounded corners
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
                    {filteredProposals.map((item) => (
                        <ProposalTableRow
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
                        />
                    ))}
                    {filteredProposals.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                                <Typography color="text.secondary">Chưa có dữ liệu</Typography>
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
