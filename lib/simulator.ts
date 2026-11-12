
import type {SimulatorState,SimulatorAction,ReservationStation,RegisterFile,LogEntry} from "./types";
import {DEFAULT_INSTRUCTIONS,DEFAULT_REGISTER_FILE,buildInitialState} from "./defaults";
import type {Instruction} from "./types";
import type {IsaConfig} from "./isa";
function cloneState(s:SimulatorState):SimulatorState{return {...s,instructions:s.instructions.map(i=>({...i})),reservationStations:s.reservationStations.map(r=>({...r})),registerFile:{...s.registerFile},cdbQueue:[...s.cdbQueue],log:[...s.log]};}
function resolveOperand(name:string,rf:RegisterFile):{kind:"value";value:number}|{kind:"pending";qi:string}{return rf[name]??{kind:"value",value:0};}
function doIssue(state:SimulatorState):SimulatorState{
 const {issuePointer,instructions,reservationStations,registerFile,cycle,isa}=state;if(issuePointer>=instructions.length)return state;
 const instr=instructions[issuePointer],spec=isa.opcodes[instr.opcode],free=reservationStations.find(r=>r.pool===spec.unit&&!r.busy);if(!free)return state;
 const s=cloneState(state),rs=s.reservationStations.find(r=>r.name===free.name)!,copy=s.instructions[issuePointer];
 rs.busy=true;rs.op=instr.opcode;rs.evaluator=spec.evaluator;rs.instructionId=instr.id;rs.resultReady=false;rs.result=null;rs.cyclesLeft=null;
 if(spec.format==="load"||spec.format==="store"){
  const offset=instr.offset??Number.parseInt(instr.src1,10),base=resolveOperand(instr.base??instr.src2,registerFile);
  rs.offset=offset;if(base.kind==="value"){rs.address=offset+base.value;rs.Qbase=null;if(spec.format==="load")rs.Vj=rs.address;}else{rs.address=null;rs.Qbase=base.qi;}
  if(spec.format==="store"){const val=resolveOperand(instr.src1,registerFile);rs.Vj=val.kind==="value"?val.value:null;rs.Qj=val.kind==="pending"?val.qi:null;}
  rs.Vk=null;rs.Qk=null;
 }else{
  rs.offset=null;rs.Qbase=null;
  const a=resolveOperand(instr.src1,registerFile),b=resolveOperand(instr.src2,registerFile);
  rs.Vj=a.kind==="value"?a.value:null;rs.Qj=a.kind==="pending"?a.qi:null;
  rs.Vk=b.kind==="value"?b.value:null;rs.Qk=b.kind==="pending"?b.qi:null;
 }
 if(spec.format!=="store")s.registerFile[instr.dest]={kind:"pending",qi:rs.name};
 copy.issueCycle=cycle;s.issuePointer++;
 s.log=[...s.log,{cycle,kind:"issued",rsName:rs.name,instructionId:instr.id,detail:`${instr.opcode} issued to ${rs.name}`} satisfies LogEntry];
 return s;
}
function evaluate(rs:ReservationStation):number{
 const a=rs.Vj??0,b=rs.Vk??0;
 switch(rs.evaluator){
  case "add":return a+b;
  case "sub":return a-b;
  case "mul":return a*b;
  case "div":return b!==0?a/b:0;
  case "load":return rs.address!==null?rs.address*1.5:0;
  case "store":return a;
  default:return 0;
 }
}
function doExecute(state:SimulatorState):SimulatorState{
 const s=cloneState(state),cycle=s.cycle,newLog:LogEntry[]=[];
 for(const rs of s.reservationStations){
  if(!rs.busy||rs.resultReady||rs.Qj!==null||rs.Qk!==null||rs.Qbase!==null)continue;
  const instr=s.instructions.find(i=>i.id===rs.instructionId)!;if(instr.issueCycle===cycle)continue;
  if(rs.cyclesLeft===null){const spec=s.isa.opcodes[instr.opcode];rs.cyclesLeft=spec.latency;instr.execStartCycle=cycle;newLog.push({cycle,kind:"execStart",rsName:rs.name,instructionId:rs.instructionId!,detail:`${rs.name} begins execution (${instr.opcode}, ${spec.latency} cycles)`});}
  rs.cyclesLeft--;
  if(rs.cyclesLeft<=0){rs.cyclesLeft=0;rs.resultReady=true;rs.result=evaluate(rs);instr.execEndCycle=cycle;newLog.push({cycle,kind:"execEnd",rsName:rs.name,instructionId:rs.instructionId!,detail:`${rs.name} finished execution (result=${rs.result.toFixed(4)})`});}
 }
 s.log=[...s.log,...newLog];return s;
}
function doWriteback(state:SimulatorState):SimulatorState{
 const s=cloneState(state),cycle=s.cycle;
 const ready=s.reservationStations.filter(rs=>rs.busy&&rs.resultReady&&s.instructions.find(i=>i.id===rs.instructionId)?.execEndCycle!==cycle)
 .sort((a,b)=>{const aq=s.cdbQueue.includes(a.name),bq=s.cdbQueue.includes(b.name);return aq===bq?(a.instructionId??999)-(b.instructionId??999):aq?-1:1;});
 if(!ready.length)return s;
 const sender=ready[0],value=sender.result!,tag=sender.name,id=sender.instructionId!;
 for(const rs of s.reservationStations){
  if(rs.Qj===tag){rs.Vj=value;rs.Qj=null;}if(rs.Qk===tag){rs.Vk=value;rs.Qk=null;}
  if(rs.Qbase===tag){rs.address=(rs.offset??0)+value;if(rs.evaluator==="load")rs.Vj=rs.address;rs.Qbase=null;}
 }
 for(const [reg,entry] of Object.entries(s.registerFile))if(entry.kind==="pending"&&entry.qi===tag)s.registerFile[reg]={kind:"value",value};
 const instr=s.instructions.find(i=>i.id===id)!;instr.writebackCycle=cycle;
 Object.assign(sender,{busy:false,op:null,evaluator:null,Vj:null,Vk:null,Qj:null,Qk:null,address:null,offset:null,Qbase:null,cyclesLeft:null,resultReady:false,result:null,instructionId:null});
 const queued=ready.slice(1).map(r=>r.name).filter(n=>!s.cdbQueue.includes(n));
 s.cdbQueue=[...s.cdbQueue.filter(n=>n!==tag),...queued];
 s.log=[...s.log,{cycle,kind:"writeback",rsName:tag,instructionId:id,detail:`CDB: ${tag} → ${value.toFixed(4)}`}];return s;
}
export function stepOnce(state:SimulatorState):SimulatorState{
 let s=cloneState(state);s.cycle++;s.started=true;s=doIssue(s);s=doExecute(s);s=doWriteback(s);
 const allWritten=s.instructions.every(i=>i.writebackCycle!==null||i.issueCycle===null),allIssued=s.issuePointer>=s.instructions.length;s.done=allIssued&&allWritten;return s;
}
export function simulatorReducer(state:SimulatorState,action:SimulatorAction):SimulatorState{
 switch(action.type){
  case "STEP":return state.done?state:stepOnce(state);
  case "RESET":return buildInitialState(DEFAULT_INSTRUCTIONS.map(i=>({...i})),{...DEFAULT_REGISTER_FILE},state.isa);
  case "SET_INSTRUCTIONS":return state.started?state:buildInitialState(action.payload,{...DEFAULT_REGISTER_FILE},state.isa);
  case "SET_PROGRAM":return buildInitialState(action.payload.instructions,{...DEFAULT_REGISTER_FILE},action.payload.isa);
 }
}
