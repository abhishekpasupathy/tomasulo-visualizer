"use client";
import React from "react";
import type {RegisterFile} from "@/lib/types";
import type {IsaConfig} from "@/lib/isa";
interface Props{registerFile:RegisterFile;isa:IsaConfig}
export default function RegisterStatusTable({registerFile,isa}:Props){
 const groups=Object.entries(isa.registerClasses).map(([name,config])=>({name,regs:Array.from({length:config.count},(_,i)=>`${name}${i}`)}));
 return <section className="flex flex-col gap-3"><h2 className="section-title">Register Status</h2><div className="flex flex-col gap-3">{groups.map(group=><div key={group.name} className="rounded-xl border border-[#1e2535] overflow-hidden"><div className="bg-[#0b0e18] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#3d4b63] border-b border-[#1e2535]">{group.name} Registers</div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-[#0b0e18]/60 border-b border-[#141926]">{group.regs.map(reg=><th key={reg} className="th text-center px-3">{reg}</th>)}</tr></thead><tbody><tr>{group.regs.map(reg=>{const entry=registerFile[reg];return <td key={reg} className="td text-center">{!entry?<span className="text-[#3d4b63]">—</span>:entry.kind==="value"?<span className="font-mono text-[#a5f3fc] font-semibold">{Number.isInteger(entry.value)?entry.value:entry.value.toFixed(3)}</span>:<span className="inline-block px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-[#1e3a5f] text-[#60a5fa] border border-[#2563eb]/40">{entry.qi}</span>}</td>;})}</tr></tbody></table></div></div>)}</div></section>;
}