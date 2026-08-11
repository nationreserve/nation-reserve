import { randomUUID } from "node:crypto";
export interface BusinessEvent<T=Record<string,unknown>> { id:string; type:string; aggregateType:string; aggregateId:string; occurredAt:string; payload:T; metadata:{schemaVersion:number;organizationIds:string[];actorUserId?:string;correlationId?:string;causationId?:string;timeline?:Record<string,unknown>}; }
export type EventHandler<T=Record<string,unknown>>=(event:BusinessEvent<T>)=>Promise<void>;
export class EventBus {
  readonly #handlers=new Map<string,Set<EventHandler>>();
  subscribe(eventType:string,handler:EventHandler):()=>void { const set=this.#handlers.get(eventType)??new Set();set.add(handler);this.#handlers.set(eventType,set);return()=>set.delete(handler); }
  async publish(event:BusinessEvent):Promise<void>{for(const handler of [...(this.#handlers.get(event.type)??[]),...(this.#handlers.get("*")??[])])await handler(event);}
}
export function businessEvent(input:Omit<BusinessEvent,"id"|"occurredAt">&Partial<Pick<BusinessEvent,"id"|"occurredAt">>):BusinessEvent{return{id:input.id??randomUUID(),occurredAt:input.occurredAt??new Date().toISOString(),type:input.type,aggregateType:input.aggregateType,aggregateId:input.aggregateId,payload:input.payload,metadata:input.metadata};}
