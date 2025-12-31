import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography
} from '@mui/material';
import ProposalTableRow from './ProposalTableRow';

/**
 * HeaderCell - Styled header cell cho bảng
 */
const HeaderCell = ({ children, width }) => (
    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5', width: width, borderRight: '1px solid #e0e0e0' }}>
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
    isViceDirector
}) => {
    return (
        <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
            <Table stickyHeader size="small" sx={{ minWidth: 1200 }}>
                <TableHead>
                    <TableRow>
                        <HeaderCell width={100}>Mã Phiếu</HeaderCell>
                        <HeaderCell width={180}>Người Đề Xuất</HeaderCell>
                        <HeaderCell width={300}>Nội Dung</HeaderCell>
                        <HeaderCell width={250}>Thông Tin Bảo Trì</HeaderCell>
                        <HeaderCell width={400}>Tiến Độ & Hành Động</HeaderCell>
                        <HeaderCell width={80}>Công Cụ</HeaderCell>
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
