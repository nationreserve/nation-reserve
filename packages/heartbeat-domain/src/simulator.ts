import { randomBytes } from "node:crypto";
import { canonicalHeartbeat,hmacSignature } from "./crypto.js";
import { heartbeatMessageSchema } from "./schemas.js";

if(process.env.NODE_ENV==="production")throw new Error("Heartbeat simulator is disabled in production");
const required=(name:string)=>{const value=process.env[name];if(!value)throw new Error(`${name} is required`);return value;};
const api=process.env.HEARTBEAT_SIMULATOR_API_URL??"http://127.0.0.1:3000";
const secret=required("HEARTBEAT_SIMULATOR_SECRET");
const prefix=required("HEARTBEAT_SIMULATOR_CREDENTIAL_PREFIX");
let sequence=Number(process.env.HEARTBEAT_SIMULATOR_SEQUENCE??1);
const interval=Number(process.env.HEARTBEAT_SIMULATOR_INTERVAL_SECONDS??30)*1000;
const send=async()=>{
  const message=heartbeatMessageSchema.parse({schemaVersion:1,messageId:crypto.randomUUID(),
    robotId:required("HEARTBEAT_SIMULATOR_ROBOT_ID"),
    manufacturerSerialNumber:required("HEARTBEAT_SIMULATOR_SERIAL"),sentAt:new Date(),
    sequenceNumber:sequence++,nonce:randomBytes(18).toString("base64url"),
    manufacturerState:process.env.HEARTBEAT_SIMULATOR_STATE??"WORKING",
    assignmentId:required("HEARTBEAT_SIMULATOR_ASSIGNMENT_ID"),
    firmwareVersion:process.env.HEARTBEAT_SIMULATOR_FIRMWARE??"dev-simulator",
    apiVersion:"v1",networkStatus:"connected"});
  let signature=hmacSignature(canonicalHeartbeat(message),secret);
  if(process.env.HEARTBEAT_SIMULATOR_INVALID_SIGNATURE==="true")signature="invalid";
  const response=await fetch(`${api}/robot-api/v1/heartbeat`,{method:"POST",
    headers:{"content-type":"application/json","x-rwp-robot-credential":prefix,
      "x-rwp-signature-algorithm":"hmac-sha-256","x-rwp-signature":signature},
    body:JSON.stringify(message)});
  process.stdout.write(`${response.status} ${await response.text()}\n`);
};
await send();
if(process.argv.includes("--continuous"))setInterval(()=>void send(),interval);
