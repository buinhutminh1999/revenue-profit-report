import { z } from 'zod';

export const projectSearchSchema = z.object({
    searchText: z.string().optional(),
    filterStatus: z.enum(['all', 'active', 'closed']).default('all'),
});

export const deviceMonitoringSchema = z.object({
    searchTerm: z.string().optional(),
    statusFilter: z.enum(['all', 'online', 'offline']).default('all'),
    selectedDate: z.date().nullable(),
    timeFilter: z.enum(['allDay', 'workingHours']).default('workingHours'),
    viewMode: z.enum(['grid', 'list']).default('grid'),
});
