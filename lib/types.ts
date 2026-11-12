import type {IsaConfig} from "./isa";
export interface Instruction{id:number;opcode:string;dest:string;src1:string;src2:string;issueCycle:number|null;execStartCycle:number|null;execEndCycle:number|null;writebackCycle:number|null;offset?:number|null;base?:string|null}
export type RSPool=string;
export interface ReservationStation{name:string;pool:RSPool;busy:boolean;op:string|null;evaluator:string|null;Vj:number|null;Vk:number|null;Qj:string|null;Qk:string|null;address:number|null;offset:number|null;Qbase:string|null;cyclesLeft:number|null;resultReady:boolean;result:number|null;instructionId:number|null}
export type RegisterEntry={kind:"value";value:number}|{kind:"pending";qi:string};export type RegisterFile=Record<string,RegisterEntry>;
export interface CDBBroadcast{tag:string;value:number;instructionId:number}
export type LogEventKind="issued"|"execStart"|"execEnd"|"writeback"|"cdbStall";
export interface LogEntry{cycle:number;kind:LogEventKind;rsName:string;instructionId:number;detail?:string}
export interface SimulatorState{instructions:Instruction[];reservationStations:ReservationStation[];registerFile:RegisterFile;cycle:number;issuePointer:number;cdbQueue:string[];log:LogEntry[];done:boolean;started:boolean;isa:IsaConfig}
export type SimulatorAction={type:"STEP"}|{type:"RESET"}|{type:"SET_INSTRUCTIONS";payload:Instruction[]}|{type:"SET_PROGRAM";payload:{instructions:Instruction[];isa:IsaConfig}};
export const DEFAULT_REGISTER_FILE:RegisterFile={R2:{kind:"value",value:100},R3:{kind:"value",value:200},F0:{kind:"value",value:0},F2:{kind:"value",value:0},F4:{kind:"value",value:6},F6:{kind:"value",value:0},F8:{kind:"value",value:0},F10:{kind:"value",value:0}};
