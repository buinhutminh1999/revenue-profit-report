import { z } from 'zod';

export const eventSchema = z.object({
    backgroundType: z.enum(['shader', 'color']),
    backgroundColor: z.string(),
    companyNameColor: z.string(),
    titleLine1: z.string().optional(),
    titleLine2: z.string().optional(),
    slogan: z.string().optional(),
    locationAndDate: z.string().optional(),
    eventDateTime: z.string().optional(),

    // Font sizes - ensure they are numbers
    titleLine1Size: z.coerce.number().min(0),
    titleLine2Size: z.coerce.number().min(0),
    statusTextSize: z.coerce.number().min(0),
    countdownSize: z.coerce.number().min(0),
    locationAndDateSize: z.coerce.number().min(0),
});
