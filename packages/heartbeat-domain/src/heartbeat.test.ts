import { describe,expect,it } from "vitest";
import { generateKeyPairSync,sign } from "node:crypto";
import { canonicalHeartbeat,hmacSignature,verifyEd25519,verifyHmac } from "./crypto.js";
import { heartbeatMessageSchema } from "./schemas.js";

const message=heartbeatMessageSchema.parse({schemaVersion:1,messageId:crypto.randomUUID(),
  robotId:crypto.randomUUID(),manufacturerSerialNumber:"NR-001",
  sentAt:"2026-07-28T12:00:00.000Z",sequenceNumber:10,nonce:"0123456789abcdef",
  manufacturerState:"WORKING",assignmentId:crypto.randomUUID(),firmwareVersion:"1.0.0",
  apiVersion:"v1",networkStatus:"connected"});
describe("heartbeat signing",()=>{
  it("canonicalizes deterministically and rejects a changed signed field",()=>{
    const canonical=canonicalHeartbeat(message);const secret="test-secret";
    const signature=hmacSignature(canonical,secret);
    expect(verifyHmac(canonical,secret,signature)).toBe(true);
    expect(verifyHmac(canonicalHeartbeat({...message,sequenceNumber:11}),secret,signature)).toBe(false);
  });
  it("verifies Ed25519 without private-key storage",()=>{
    const pair=generateKeyPairSync("ed25519");
    const canonical=canonicalHeartbeat(message);
    const signature=sign(null,Buffer.from(canonical),pair.privateKey).toString("base64url");
    expect(verifyEd25519(canonical,pair.publicKey.export({type:"spki",format:"pem"}).toString(),signature)).toBe(true);
  });
});
