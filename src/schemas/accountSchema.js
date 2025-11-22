import { z } from 'zod';

export const accountSchema = z.object({
    accountId: z.string().min(1, "Mã tài khoản không được để trống"),
    accountName: z.string().min(1, "Tên tài khoản không được để trống"),
    parentId: z.string().optional().nullable(),
    childrenData: z.string().optional(), // Cho trường hợp thêm hàng loạt
});
