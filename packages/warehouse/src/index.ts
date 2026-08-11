export const reportingViews=["robot_daily_summary","company_daily_summary","owner_daily_summary","financial_daily_summary","payment_daily_summary","heartbeat_daily_summary"]as const;
export type ReportingView=typeof reportingViews[number];
export function refreshStatement(view:ReportingView,concurrently=true):string{return`REFRESH MATERIALIZED VIEW ${concurrently?"CONCURRENTLY ":""}${view}`;}
