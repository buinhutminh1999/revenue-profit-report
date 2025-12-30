import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogActions, DialogContent, DialogTitle,
    TextField, Button, Stack, Typography, CircularProgress
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountSchema } from "../../schemas/accountSchema";

const db = getFirestore();
const ACCOUNTS_COLLECTION = 'chartOfAccounts';

// Hook for adding accounts
const useAddAccounts = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newAccounts) => {
            const batch = writeBatch(db);
            newAccounts.forEach(acc => {
                const docRef = doc(db, ACCOUNTS_COLLECTION, acc.accountId);
                batch.set(docRef, acc);
            });
            await batch.commit();
        },
        onSuccess: () => {
            toast.success('Thêm tài khoản thành công!');
            queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
            queryClient.invalidateQueries({ queryKey: ['accountsStructure'] });
        },
        onError: (error) => toast.error(`Lỗi: ${error.message}`),
    });
};

const AddAccountDialog = ({ open, onClose, parent = null }) => {
    const addMutation = useAddAccounts();
    const [isChecking, setIsChecking] = useState(false);

    const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm({
        resolver: zodResolver(accountSchema),
        defaultValues: {
            accountId: "",
            accountName: "",
            childrenData: "",
            parentId: null
        }
    });

    useEffect(() => {
        if (open) {
            if (parent) {
                setValue("accountId", parent.accountId);
                setValue("accountName", parent.accountName);
                setValue("parentId", parent.accountId);
            } else {
                reset({ accountId: "", accountName: "", childrenData: "", parentId: null });
            }
            setIsChecking(false);
        }
    }, [open, parent, reset, setValue]);

    const onSubmit = async (data) => {
        const newParentId = data.accountId.trim();
        const newParentName = data.accountName.trim();
        const pastedChildren = data.childrenData ? data.childrenData.trim() : "";
        const accountsToCreate = [];

        // If no parent (creating root), create the parent itself
        if (!parent) {
            if (newParentId || newParentName) {
                accountsToCreate.push({
                    accountId: newParentId,
                    accountName: newParentName,
                    parentId: null,
                });
            }
        }

        if (pastedChildren) {
            const childrenParentId = parent ? parent.accountId : newParentId;
            if (!childrenParentId) {
                toast.error('Phải có thông tin tài khoản cha để thêm danh sách con.');
                return;
            }
            const childrenLines = pastedChildren.split('\n');
            childrenLines.forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine) {
                    const parts = trimmedLine.split(/\s+/);
                    const accountId = parts[0];
                    const accountName = parts.slice(1).join(' ');
                    if (accountId && accountName) {
                        accountsToCreate.push({
                            accountId,
                            accountName,
                            parentId: childrenParentId,
                        });
                    }
                }
            });
        }

        if (accountsToCreate.length === 0) {
            toast.error('Không có thông tin hợp lệ để thêm mới.');
            return;
        }

        setIsChecking(true);
        try {
            const currentAccounts = await getDocs(collection(db, ACCOUNTS_COLLECTION));
            const existingAccountIds = new Set(currentAccounts.docs.map(doc => doc.data().accountId));

            for (const acc of accountsToCreate) {
                if (existingAccountIds.has(acc.accountId)) {
                    toast.error(`Mã tài khoản "${acc.accountId}" đã tồn tại!`);
                    setIsChecking(false);
                    return;
                }
            }

            await addMutation.mutateAsync(accountsToCreate);
            setIsChecking(false);
            onClose();

        } catch (error) {
            toast.error("Lỗi khi kiểm tra dữ liệu: " + error.message);
            setIsChecking(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{parent ? `Thêm tài khoản con cho [${parent.accountId}]` : 'Tạo Tài Khoản Mới'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }} component="form" id="add-account-form" onSubmit={handleSubmit(onSubmit)}>
                    <Typography variant="subtitle1" gutterBottom>Thông tin tài khoản cha</Typography>
                    <TextField
                        autoFocus margin="dense" label="Mã Tài Khoản Cha" fullWidth variant="outlined"
                        disabled={!!parent}
                        error={!!errors.accountId} helperText={errors.accountId?.message}
                        {...register("accountId")}
                    />
                    <TextField
                        margin="dense" label="Tên Tài Khoản Cha" fullWidth variant="outlined"
                        disabled={!!parent}
                        error={!!errors.accountName} helperText={errors.accountName?.message}
                        {...register("accountName")}
                    />
                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Dán danh sách tài khoản con</Typography>
                    <Typography variant="body2" color="text.secondary">(Mỗi dòng một tài khoản, định dạng: Mã Tên tài khoản)</Typography>
                    <TextField
                        margin="dense" label="Danh sách tài khoản con" fullWidth multiline rows={8} variant="outlined"
                        placeholder={"21201 Đầu tư xây dựng nhà máy\n21301 Mua sắm thiết bị nhà máy"}
                        {...register("childrenData")}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px' }}>
                <Button onClick={onClose}>Hủy</Button>
                <Button type="submit" form="add-account-form" variant="contained" disabled={addMutation.isPending || isChecking}>
                    {(addMutation.isPending || isChecking) ? <CircularProgress size={24} /> : 'Lưu'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddAccountDialog;
