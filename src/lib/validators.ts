import { z } from "zod";

export const settingsSchema = z.object({
  repoName: z.string().min(1).max(100).optional(),
  commitsPerDay: z.number().int().min(1).max(10).optional(),
  commitTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format").optional(),
  timezone: z.string().min(1).max(50).optional(),
  active: z.boolean().optional(),
});

export const createRepoSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9._-]+$/, "Invalid repository name"),
  isPrivate: z.boolean(),
});

export const customCommitSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  count: z.number().int().min(1).max(10),
  note: z.string().max(200).optional(),
});