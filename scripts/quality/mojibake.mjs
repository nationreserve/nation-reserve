import {readFile,readdir,writeFile} from "node:fs/promises";
import {extname,join,relative} from "node:path";

const roots=["apps","packages","docs","artifacts","scripts"];
const extensions=new Set([".ts",".tsx",".js",".jsx",".json",".css",".html",".md",".yaml",".yml"]);
const ignored=new Set(["node_modules","dist","coverage",".git"]);
const suspicious=/\u00c2|\u00c3|\u00e2\u20ac|\u00f0\u0178|\ufffd/u;
const windows1252=new TextDecoder("windows-1252");
const utf8=new TextDecoder("utf-8",{fatal:true});
const reverse=new Map();
for(let byte=0;byte<256;byte++)reverse.set(windows1252.decode(Uint8Array.of(byte)),byte);

function score(value){return [...value].reduce((total,char)=>total+(char==="\ufffd"?20:char==="\u00c2"||char==="\u00c3"?5:char==="\u00e2"||char==="\u00f0"?2:0),0)}
function decodeOnce(value){const bytes=[];for(const char of value){const byte=reverse.get(char);if(byte===undefined)return value;bytes.push(byte)}try{return utf8.decode(Uint8Array.from(bytes))}catch{return value}}
function repairRun(value){let current=value;for(let pass=0;pass<6;pass++){const next=decodeOnce(current);if(next===current||score(next)>=score(current))break;current=next}return current}
const direct=new Map([["\u00e2\u20ac\u00a6","\u2026"],["\u00e2\u20ac\u201d","\u2014"],["\u00e2\u20ac\u2122","\u2019"],["\u00e2\u2020\u2019","\u2192"],["\u00c2\u00b7","\u00b7"],["\u00c3\u2014","\u00d7"]]);
export function repairMojibake(value){let repaired=value;for(const[from,to]of direct)repaired=repaired.replaceAll(from,to);return repaired.replace(/[^\x00-\x7f]+/gu,repairRun)}
export function containsMojibake(value){return suspicious.test(value)}
async function files(path){const found=[];for(const entry of await readdir(path,{withFileTypes:true})){if(ignored.has(entry.name))continue;const child=join(path,entry.name);if(entry.isDirectory())found.push(...await files(child));else if(extensions.has(extname(entry.name)))found.push(child)}return found}

const fix=process.argv.includes("--fix"),findings=[];
for(const root of roots){for(const file of await files(root)){const before=await readFile(file,"utf8"),after=fix?repairMojibake(before):before;if(fix&&after!==before)await writeFile(file,after,"utf8");if(containsMojibake(after))findings.push(relative(process.cwd(),file))}}
if(findings.length){console.error(`Mojibake detected in ${findings.length} file(s):\n${findings.join("\n")}`);process.exitCode=1}else console.log("Mojibake scan passed.");
