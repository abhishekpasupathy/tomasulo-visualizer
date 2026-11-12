import defaultIsaJson from "./isa.default.json";
export interface FunctionalUnitConfig { stations:number }
export interface OpcodeConfig { unit:string; format:string; latency:number; evaluator:string }
export interface IsaConfig {
 units:Record<string,FunctionalUnitConfig>; opcodes:Record<string,OpcodeConfig>;
 formats:Record<string,string[]>; registerClasses:Record<string,{count:number}>;
 slotClasses:Record<string,string[]>; memory:{syntax:string;addressRegisterClasses:string[]};
}
export const DEFAULT_ISA=defaultIsaJson as IsaConfig;
export function mergeIsa(base:IsaConfig,patch:Partial<IsaConfig>):IsaConfig {
 return {...base,...patch,units:{...base.units,...patch.units},opcodes:{...base.opcodes,...patch.opcodes},
 formats:{...base.formats,...patch.formats},registerClasses:{...base.registerClasses,...patch.registerClasses},
 slotClasses:{...base.slotClasses,...patch.slotClasses},memory:{...base.memory,...patch.memory}};
}
