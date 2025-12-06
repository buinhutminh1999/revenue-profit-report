import { z } from 'zod';

export const assetSchema = z.object({
    name: z.string().min(1, "Tên tài sản không được để trống"),
    unit: z.string().min(1, "Đơn vị tính không được để trống"),
    quantity: z.coerce.number().min(1, "Số lượng phải lớn hơn 0"),
    size: z.string().optional(),
    description: z.string().optional(),
    notes: z.string().optional(),
    departmentId: z.string().min(1, "Vui lòng chọn phòng ban"),
    // Các trường khác nếu cần
    managementBlock: z.string().optional(),
    id: z.string().optional(),
});
