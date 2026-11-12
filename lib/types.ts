
import type { IsaConfig } from "./isa";
import { DEFAULT_ISA } from "./isa";
export interface Instruction {
 id:number; opcode:string; dest:string; src1:string; src2:string;
 issueCycle:number|null; execStartCycle:number|null; execEndCycle:number|null; writebackCycle:number|null;
 offset?:number|null; base?:string|null;
}
export type RSPool=string;
export interface ReservationStation {
 name:string; pool:RSPool; busy:boolean; op:string|null; evaluator:string|null;
 Vj:number|null; Vk:number|null; Qj:string|null; Qk:string|null; address:number|null;
 offset:number|null; Qbase:string|null; cyclesLeft:number|null; resultReady:boolean; result:number|null; instructionId:number|null;
}
export type RegisterEntry={kind:"value";value:number}|{kind:"pending";qi:string};
export type RegisterFile=Record<string,RegisterEntry>;
export interface CDBBroadcast {tag:string;value:number;instructionId:number}
export type LogEventKind="issued"|"execStart"|"execEnd"|"writeback"|"cdbStall";
export interface LogEntry {cycle:number;kind:LogEventKind;rsName:string;instructionId:number;detail?:string}
export interface SimulatorState {
 instructions:Instruction[]; reservationStations:ReservationStation[]; registerFile:RegisterFile;
 cycle:number;issuePointer:number;cdbQueue:string[];log:LogEntry[];done:boolean;started:boolean;isa:IsaConfig;
}
export type SimulatorAction={type:"STEP"}|{type:"RESET"}|{type:"SET_INSTRUCTIONS";payload:Instruction[]}|{type:"SET_PROGRAM";payload:{instructions:Instruction[];isa:IsaConfig}};
export const DEFAULT_REGISTER_FILE:RegisterFile={
 R2:{kind:"value",value:100},R3:{kind:"value",value:200},
 F0:{kind:"value",value:0},F2:{kind:"value",value:0},F4:{kind:"value",value:6},
 F6:{kind:"value",value:0},F8:{kind:"value",value:0},F10:{kind:"value",value:0}
};
export const DEFAULT_INSTRUCTIONS:Instruction[]=[
 {id:0,opcode:"LD",dest:"F6",src1:"34",src2:"R2",offset:34,base:"R2",issueCycle:null,execStartCycle:null,execEndCycle:null,writebackCycle:null},
 {id:1,opcode:"LD",dest:"F2",src1:"45",src2:"R3",offset:45,base:"R3",issueCycle:null,execStartCycle:null,execEndCycle:null,writebackCycle:null},
 {id:2,opcode:"MUL.D",dest:"F0",src1:"F2",src2:"F4",issueCycle:null,execStartCycle:null,execEndCycle:null,writebackCycle:null},
 {id:3,opcode:"SUB.D",dest:"F8",src1:"F6",src2:"F2",issueCycle:null,execStartCycle:null,execEndCycle:null,writebackCycle:null},
 {id:4,opcode:"DIV.D",dest:"F10",src1:"F0",src2:"F6",issueCycle:null,execStartCycle:null,execEndCycle:null,writebackCycle:null},
 {id:5,opcode:"ADD.D",dest:"F6",src1:"F8",src2:"F2",issueCycle:null,execStartCycle:null,execEndCycle:null,writebackCycle:null}
];
export function buildInitialRS(isa:IsaConfig=DEFAULT_ISA):ReservationStation[]{
 const out:ReservationStation[]=[];
 for(const [unit,config] of Object.entries(isa.units)){
  for(let i=1;i<=config.stations;i++)out.push({name:`${unit[0].toUpperCase()+unit.slice(1)}${i}`,pool:unit,busy:false,op:null,evaluator:null,Vj:null,Vk:null,Qj:null,Qk:null,address:null,offset:null,Qbase:null,cyclesLeft:null,resultReady:false,result:null,instructionId:null});
 }
 return out;
}
export function buildInitialState(instructions:Instruction[]=DEFAULT_INSTRUCTIONS,registerFile:RegisterFile=DEFAULT_REGISTER_FILE,isa:IsaConfig=DEFAULT_ISA):SimulatorState {
 return {instructions:instructions.map(i=>({...i})),reservationStations:buildInitialRS(isa),registerFile:{...registerFile},cycle:0,issuePointer:0,cdbQueue:[],log:[],done:false,started:false,isa};
}
