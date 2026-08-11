import{z}from"zod";
export const reportCategories=["operational","financial","manufacturing","company","owner","platform"]as const;
export const reportDefinitionSchema=z.object({reportKey:z.string().regex(/^[a-z][a-z0-9_]{2,80}$/),name:z.string().min(3),category:z.enum(reportCategories),version:z.number().int().positive().default(1)});
export const reportRunSchema=z.object({reportKey:z.string(),organizationId:z.string().uuid().optional(),from:z.coerce.date(),to:z.coerce.date(),timezone:z.string().default("UTC"),filters:z.record(z.string(),z.unknown()).default({})}).refine(v=>v.to>=v.from,{message:"Report end must not precede start"});
export const savedReportSchema=z.object({name:z.string().min(3).max(120),reportKey:z.string(),filters:z.record(z.string(),z.unknown()).default({}),layout:z.record(z.string(),z.unknown()).default({}),favorite:z.boolean().default(false),sharedWithinOrganization:z.boolean().default(false)});
export const scheduledReportSchema=savedReportSchema.pick({name:true,reportKey:true,filters:true}).extend({frequency:z.enum(["daily","weekly","monthly","quarterly"]),recipients:z.array(z.string().email()).min(1).max(50),exportType:z.enum(["csv","xlsx","pdf"]),timezone:z.string().default("UTC"),enabled:z.boolean().default(true)});
export type ReportRun=z.infer<typeof reportRunSchema>;
