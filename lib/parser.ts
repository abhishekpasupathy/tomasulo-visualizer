import type { IsaConfig, OpcodeConfig } from "./isa";
import { mergeIsa } from "./isa";
export interface ParsedInstruction {
 id:number; opcode:string; dest:string; src1:string; src2:string; offset:number|null; base:string|null;
 issueCycle:null; execStartCycle:null; execEndCycle:null; writebackCycle:null;
}
export interface ParseIssue {line:number;message:string;hint?:string}
export interface ParseResult {program:ParsedInstruction[]|null;errors:ParseIssue[];warnings:ParseIssue[];isa:IsaConfig}
const positiveInt=(v:string)=>/^\d+$/.test(v)&&Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null;
function distance(a:string,b:string):number {
 const row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}
 return row[b.length];
}
function validReg(name:string,classes:string[],isa:IsaConfig):boolean {
 const m=/^([A-Za-z][A-Za-z0-9]*?)(\d+)$/.exec(name);if(!m)return false;
 const cls=m[1].toUpperCase();return classes.some(c=>c.toUpperCase()===cls)&&Number(m[2])<(isa.registerClasses[cls]?.count??0);
}
function memory(v:string):{offset:number;base:string}|null {
 const m=/^(-?\d+)\(([A-Za-z][A-Za-z0-9]*\d+)\)$/.exec(v);if(!m||!Number.isSafeInteger(Number(m[1])))return null;
 return {offset:Number(m[1]),base:m[2].toUpperCase()};
}
export function parseProgram(text:string,baseIsa:IsaConfig):ParseResult {
 const isa=mergeIsa(baseIsa,{}),errors:ParseIssue[]=[],warnings:ParseIssue[]=[];
 const lines=text.split(/\r?\n/),pending:{line:number;opcode:string;args:string[]}[]=[];
 const unitCounts:Record<string,number>={},stations:Record<string,number>={},registers:Record<string,number>={},latencies:Record<string,number>={},ops:Record<string,OpcodeConfig>={};
 const error=(line:number,message:string,hint?:string)=>errors.push({line,message,hint});
 lines.forEach((raw,index)=>{
  const ln=index+1,line=raw.replace(/#.*$/,"").replace(/\/\/.*$/,"").replace(/;.*$/,"").trim();if(!line)return;
  let m:RegExpExecArray|null;
  if(line.startsWith("@")){
   if((m=/^@latency\s+([\w.]+)=(\S+)$/i.exec(line))){const n=positiveInt(m[2]);if(!n||!isa.opcodes[m[1].toUpperCase()])error(ln,"Invalid latency directive.","Use @latency OPCODE=positive-integer for an existing opcode.");else latencies[m[1].toUpperCase()]=n;}
   else if((m=/^@stations\s+([\w-]+)=(\S+)$/i.exec(line))){const n=positiveInt(m[2]);if(!n||!isa.units[m[1].toLowerCase()])error(ln,"Invalid stations directive.","Define a missing unit with @unit.");else stations[m[1].toLowerCase()]=n;}
   else if((m=/^@unit\s+([\w-]+)\s+stations=(\S+)$/i.exec(line))){const n=positiveInt(m[2]);if(!n)error(ln,"Invalid unit station count.","Use @unit name stations=positive-integer.");else unitCounts[m[1].toLowerCase()]=n;}
   else if((m=/^@op\s+([\w.]+)\s+(.+)$/i.exec(line))){
    const name=m[1].toUpperCase(),attrs:Record<string,string>={};
    for(const part of m[2].trim().split(/\s+/)){const ix=part.indexOf("=");if(ix>0)attrs[part.slice(0,ix)]=part.slice(ix+1);}
    const latency=positiveInt(attrs.latency??"");
    if(!attrs.unit||!attrs.format||!latency||Object.keys(attrs).some(k=>!["unit","format","latency","evaluator"].includes(k)))error(ln,"Invalid @op definition.","Use @op NAME unit=UNIT format=FORMAT latency=n [evaluator=id].");
    else ops[name]={unit:attrs.unit.toLowerCase(),format:attrs.format,latency,evaluator:attrs.evaluator??attrs.unit.toLowerCase()};
   }
   else if((m=/^@registers\s+([A-Za-z][A-Za-z0-9]*)=(\S+)$/i.exec(line))){const n=positiveInt(m[2]);if(!n)error(ln,"Invalid register count.","Use @registers CLASS=positive-integer.");else registers[m[1].toUpperCase()]=n;}
   else error(ln,"Unknown or malformed directive.","Supported directives: @latency, @stations, @unit, @op, @registers.");
   return;
  }
  const parts=line.split(/[\s,]+/).filter(Boolean);pending.push({line:ln,opcode:parts[0].toUpperCase(),args:parts.slice(1)});
 });
 Object.entries(unitCounts).forEach(([name,count])=>isa.units[name]={stations:count});
 Object.entries(stations).forEach(([name,count])=>isa.units[name].stations=count);
 Object.entries(registers).forEach(([name,count])=>{if(!isa.registerClasses[name])warnings.push({line:1,message:`Register class '${name}' added by @registers.`});isa.registerClasses[name]={count};});
 Object.entries(ops).forEach(([name,op])=>{if(!isa.units[op.unit])error(1,`Opcode '${name}' references unknown unit '${op.unit}'.`);else if(!isa.formats[op.format])error(1,`Opcode '${name}' references unknown format '${op.format}'.`);else isa.opcodes[name]=op;});
 Object.entries(latencies).forEach(([name,n])=>isa.opcodes[name].latency=n);
 const program:ParsedInstruction[]=[];
 for(const item of pending){
  const spec=isa.opcodes[item.opcode];
  if(!spec){const closest=Object.keys(isa.opcodes).sort((a,b)=>distance(item.opcode,a)-distance(item.opcode,b))[0];error(item.line,`Unknown opcode '${item.opcode}'.`,`Did you mean '${closest}'? Define it with @op if it is new.`);continue;}
  const shape=isa.formats[spec.format];
  if(item.args.length!==shape.length){error(item.line,`Wrong operand count for ${item.opcode}: expected ${shape.length}, got ${item.args.length}.`,`Format '${spec.format}' expects: ${shape.join(", ")}.`);continue;}
  const inst:ParsedInstruction={id:program.length,opcode:item.opcode,dest:"",src1:"",src2:"",offset:null,base:null,issueCycle:null,execStartCycle:null,execEndCycle:null,writebackCycle:null};let bad=false;
  shape.forEach((slot,i)=>{const value=item.args[i],[kind,role]=slot.split(":");
   if(kind==="reg"){const classes=isa.slotClasses[slot]??[];if(!validReg(value,classes,isa)){error(item.line,`Invalid register '${value}' for operand '${slot}'.`,`Accepted classes: ${classes.join(", ")}; index must be below configured count.`);bad=true;}else if(role==="dest")inst.dest=value.toUpperCase();else if(role==="src1")inst.src1=value.toUpperCase();else if(role==="src2")inst.src2=value.toUpperCase();}
   else if(kind==="mem"){const mem=memory(value),allowed=isa.memory.addressRegisterClasses;if(!mem){error(item.line,`Invalid memory operand '${value}'.`,"Use offset(BASE), for example 34(R2).");bad=true;}else if(!validReg(mem.base,allowed,isa)){error(item.line,`Invalid base register '${mem.base}'.`,`Accepted classes: ${allowed.join(", ")}.`);bad=true;}else{inst.offset=mem.offset;inst.base=mem.base;if(role==="dest")inst.dest=mem.base;else if(role==="src1")inst.src1=mem.base;else if(role==="src2")inst.src2=mem.base;}}
  });
  if(!bad)program.push(inst);
 }
 if(!text.trim()||pending.length===0)error(1,"Program is empty.","Add at least one instruction.");
 return {program:errors.length===0?program:null,errors,warnings,isa};
}
