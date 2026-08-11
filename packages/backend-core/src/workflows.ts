import { businessEvent, type BusinessEvent } from "./event-bus.js";
export interface WorkflowDefinition { type:string; initial:string; terminal:string[]; transitions:Record<string,Record<string,string>>; }
export interface WorkflowInstance { id:string; type:string; aggregateType:string; aggregateId:string; state:string; version:number; organizationIds:string[]; }
export interface TransitionResult { instance:WorkflowInstance; event:BusinessEvent; }
export class WorkflowEngine {
  readonly #definitions=new Map<string,WorkflowDefinition>();
  constructor(definitions:WorkflowDefinition[]=standardWorkflows){for(const definition of definitions)this.#definitions.set(definition.type,definition);}
  transition(instance:WorkflowInstance,action:string,actorUserId?:string):TransitionResult {
    const definition=this.#definitions.get(instance.type);if(!definition)throw Object.assign(new Error(`Unknown workflow: ${instance.type}`),{code:"WORKFLOW_NOT_FOUND",statusCode:404});
    const next=definition.transitions[instance.state]?.[action];if(!next)throw Object.assign(new Error(`Invalid ${instance.type} transition: ${instance.state} -> ${action}`),{code:"INVALID_WORKFLOW_TRANSITION",statusCode:409});
    const updated={...instance,state:next,version:instance.version+1};
    return{instance:updated,event:businessEvent({type:`${instance.type}.${action}`,aggregateType:instance.aggregateType,aggregateId:instance.aggregateId,payload:{previousState:instance.state,state:next,workflowId:instance.id,version:updated.version},metadata:{schemaVersion:1,organizationIds:instance.organizationIds,...(actorUserId?{actorUserId}:{}),timeline:{category:category(instance.type),summary:`${label(instance.type)} ${action.replaceAll("_"," ")}`,status:next}}})};
  }
}
const simple=(type:string,states:string[],terminal:string[]=[states.at(-1)!]):WorkflowDefinition=>({type,initial:states[0]!,terminal,transitions:Object.fromEntries(states.slice(0,-1).map((state,index)=>[state,{advance:states[index+1]!}]))});
export const standardWorkflows:WorkflowDefinition[]=[
 simple("manufacturer_application",["submitted","under_review","approved"],["approved","rejected"]),simple("robot_registration",["submitted","verified","registered"]),simple("ownership_transfer",["requested","accepted","completed"]),simple("robot_activation",["registered","eligible","active"]),simple("training_package",["draft","submitted","approved"]),simple("work_order",["draft","review","published"]),simple("manufacturer_interest",["draft","submitted","accepted"]),simple("opportunity",["created","matched","converted"]),simple("contract",["draft","submitted","approved"]),simple("robot_allocation",["pending","reserved","allocated"]),simple("scheduling",["pending","scheduled","completed"]),simple("heartbeat_validation",["received","validated","accepted"]),simple("verified_time",["open","calculated","finalized"]),simple("inactive_report",["detected","reviewed","resolved"]),simple("replacement",["requested","approved","completed"]),simple("invoice",["draft","issued","paid"]),simple("payment",["pending","processing","completed"]),simple("statement",["draft","generated","published"]),simple("payout",["scheduled","processing","completed"])
];
function category(type:string){if(type.includes("robot"))return"robot";if(["invoice","payment","statement","payout"].includes(type))return"financial";if(type.includes("contract")||type.includes("allocation")||type.includes("scheduling"))return"contract";if(type.includes("training"))return"training";if(type.includes("heartbeat")||type.includes("verified_time"))return"heartbeat";return"operations";}
function label(value:string){return value.replaceAll("_"," ").replace(/\b\w/g,letter=>letter.toUpperCase());}
