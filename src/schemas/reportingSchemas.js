import { z } from 'zod';

export const addProjectSchema = z.object({
    group: z.string().min(1, "Vui lòng chọn nhóm"),
    name: z.string().min(1, "Tên công trình không được để trống"),
    type: z.string().optional(),
});

export const createPriceTableSchema = z.object({
    projectName: z.string().min(1, "Tên công trình không được để trống"),
    durationDays: z.coerce.number().min(1, "Thời hạn phải lớn hơn 0"),
});
