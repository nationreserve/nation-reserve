export interface ExpirationService { expireAndReplace(now:Date,batchSize:number):Promise<{expired:number;replaced:number;incomplete:number}> }
/** The service transaction must lock due allocations and use their unique idempotency keys. */
export async function processExpiredOwnershipAllocations(service:ExpirationService,now=new Date(),batchSize=100){
 if(!Number.isInteger(batchSize)||batchSize<1||batchSize>1000)throw new Error("INVALID_BATCH_SIZE");
 return service.expireAndReplace(now,batchSize);
}
