import { z } from 'zod';

export const userFormSchema = z.object({
    displayName: z.string().min(1, "Tên hiển thị không được để trống"),
    email: z.string().min(1, "Email không được để trống").email("Email không hợp lệ"),
    role: z.string().min(1, "Vui lòng chọn vai trò"),
    primaryDepartmentId: z.string().nullable().optional(),
    managedDepartmentIds: z.array(z.string()).optional(),
});

export const departmentFormSchema = z.object({
    name: z.string().min(1, "Tên phòng ban không được để trống"),
    managementBlock: z.string().min(1, "Vui lòng chọn khối quản lý"),
});

export const categoryFormSchema = z.object({
    label: z.string().min(1, "Tên danh mục không được để trống"),
    code: z.string().optional(),
    description: z.string().optional(),
});

export const managementBlockSchema = z.object({
    headIds: z.array(z.string()).optional(),
    deputyIds: z.array(z.string()).optional(),
    directorApproverIds: z.array(z.string()).optional(),
});

export const approvalSettingsSchema = z.record(z.string(), z.object({
    hcApproverIds: z.array(z.string()).optional(),
    ktApproverIds: z.array(z.string()).optional(),
}));

export const whitelistSchema = z.object({
    path: z.string().min(1, "Vui lòng chọn trang chức năng"),
    user: z.object({
        uid: z.string(),
        email: z.string(),
        displayName: z.string().optional()
    }).nullable().refine(val => val !== null, "Vui lòng chọn người dùng")
});

export const documentPublisherSchema = z.object({
    title: z.string().min(1, "Tiêu đề không được để trống"),
    docId: z.string().min(1, "Số hiệu không được để trống"),
    category: z.string().optional(),
    file: z.any().refine(file => file instanceof File, "Vui lòng chọn file")
});
