export const backgroundJobTypes=["file.process","file.malware_scan","file.thumbnail","training_package.process","notification.deliver","heartbeat.cleanup","invoice.generate","payout.schedule","report.generate"] as const;
export type BackgroundJobType=typeof backgroundJobTypes[number];
export interface BackgroundJob<T=Record<string,unknown>>{id:string;type:BackgroundJobType;payload:T;status:"queued"|"running"|"completed"|"failed"|"dead_letter";attempts:number;maxAttempts:number;availableAt:string;}
export function retryDelaySeconds(attempt:number):number{return Math.min(3600,Math.max(1,2**Math.max(0,attempt-1)));}
