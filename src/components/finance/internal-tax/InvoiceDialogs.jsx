import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField,
    FormControl, InputLabel, Select, MenuItem
} from '@mui/material';

export const AddGeneralInvoiceDialog = ({ open, onClose, newInvoice, onChange, onAdd }) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Thêm Hóa Đơn Mới</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Ký hiệu mẫu số" name="formSymbol" value={newInvoice.formSymbol} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Ký hiệu hóa đơn" name="invoiceSymbol" value={newInvoice.invoiceSymbol} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Số hóa đơn" name="invoiceNumber" value={newInvoice.invoiceNumber} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Ngày lập (DD/MM/YYYY)" name="date" value={newInvoice.date} onChange={onChange} fullWidth size="small" placeholder="DD/MM/YYYY" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="MST người bán" name="sellerTaxCode" value={newInvoice.sellerTaxCode} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Tên người bán" name="sellerName" value={newInvoice.sellerName} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="MST người mua" name="buyerTaxCode" value={newInvoice.buyerTaxCode} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Tên người mua" name="buyerName" value={newInvoice.buyerName} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Địa chỉ người mua" name="buyerAddress" value={newInvoice.buyerAddress} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Tổng tiền chưa thuế" name="totalNoTax" value={newInvoice.totalNoTax} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Tổng tiền thuế" name="taxAmount" value={newInvoice.taxAmount} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Tổng tiền thanh toán" name="totalPayment" value={newInvoice.totalPayment} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Tổng tiền chiết khấu" name="tradeDiscount" value={newInvoice.tradeDiscount} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Đơn vị tiền tệ" name="currency" value={newInvoice.currency} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Tỷ giá" name="exchangeRate" value={newInvoice.exchangeRate} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Trạng thái" name="status" value={newInvoice.status} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Kết quả kiểm tra" name="checkResult" value={newInvoice.checkResult} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Ghi chú" name="note" value={newInvoice.note} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Loại chi phí" name="costType" value={newInvoice.costType} onChange={onChange} fullWidth size="small" />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={onAdd} variant="contained">Thêm</Button>
            </DialogActions>
        </Dialog>
    );
};

export const AddPurchaseInvoiceDialog = ({ open, onClose, newInvoice, onChange, onAdd }) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Thêm Hóa Đơn Mua Vào</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Nhóm</InputLabel>
                            <Select
                                name="group"
                                value={newInvoice.group}
                                label="Nhóm"
                                onChange={onChange}
                            >
                                <MenuItem value={1}>Nhóm 1</MenuItem>
                                <MenuItem value={3}>Nhóm 3</MenuItem>
                                <MenuItem value={4}>Nhóm 4</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Số hóa đơn" name="invoiceNo" value={newInvoice.invoiceNo} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Ngày lập" name="date" value={newInvoice.date} onChange={onChange} fullWidth size="small" placeholder="DD/MM/YYYY" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Tên người bán" name="seller" value={newInvoice.seller} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="MST người bán" name="sellerTax" value={newInvoice.sellerTax} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Giá trị chưa thuế" name="valueNoTax" value={newInvoice.valueNoTax} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Thuế GTGT" name="tax" value={newInvoice.tax} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Tổng cộng" name="total" value={newInvoice.total} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Thuế suất" name="rate" value={newInvoice.rate} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Loại chi phí" name="costType" value={newInvoice.costType} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Công trình" name="project" value={newInvoice.project} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Tên người mua" name="buyer" value={newInvoice.buyer} onChange={onChange} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="NK" name="nk" value={newInvoice.nk} onChange={onChange} fullWidth size="small" />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={onAdd} variant="contained">Thêm</Button>
            </DialogActions>
        </Dialog>
    );
};
