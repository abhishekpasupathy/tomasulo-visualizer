"use client";
import React,{useMemo,useState} from "react";
import {DEFAULT_ISA} from "@/lib/isa";
import {parseProgram,type ParseResult} from "@/lib/parser";
interface Props{onRun:(result:ParseResult)=>void;disabled?:boolean}
const INITIAL=`LD F6, 34(R2)
LD F2, 45(R3)
MUL.D F0, F2, F4
SUB.D F8, F6, F2
DIV.D F10, F0, F6
ADD.D F6, F8, F2`;
export default function ProgramInput({onRun,disabled=false}:Props){
 const [source,setSource]=useState(INITIAL),[sample,setSample]=useState("classic.txt"),[fileError,setFileError]=useState(""),[showIsa,setShowIsa]=useState(true);
 const result=useMemo(()=>parseProgram(source,DEFAULT_ISA),[source]),lineCount=source.split("\n").length,errorLines=new Set(result.errors.map(e=>e.line));
 async function loadSample(){try{const r=await fetch(`/samples/${sample}`);if(!r.ok)throw Error("Sample could not be loaded.");const value=await r.text();if(new TextEncoder().encode(value).byteLength>204800)throw Error("Sample exceeds 200 KB.");setSource(value);setFileError("");}catch(e){setFileError(e instanceof Error?e.message:"Sample load failed.");}}
 async function upload(file?:File){if(!file)return;if(file.size>204800){setFileError("File exceeds 200 KB.");return;}try{const buf=await file.arrayBuffer(),bytes=new Uint8Array(buf);if(bytes.includes(0))throw Error("Binary files are not supported.");const value=new TextDecoder("utf-8",{fatal:true}).decode(buf);setSource(value);setFileError("");}catch{setFileError("Please choose a valid UTF-8 text file.");}}
 return <section className="rounded-xl border border-[#1e2535] bg-[#0a0f1e] p-4 flex flex-col gap-4">
  <div className="flex flex-wrap justify-between gap-3"><div><h2 className="section-title">Input Program</h2><p className="text-xs text-[#61708b] mt-1">Edit assembly, override the ISA, and validate before execution.</p></div>
   <div className="flex flex-wrap gap-2 items-center"><select className="input-cell" value={sample} onChange={e=>setSample(e.target.value)}><option value="classic.txt">Classic example</option><option value="raw-chain.txt">RAW dependency chain</option><option value="custom-opcode.txt">Custom opcode</option></select><button className="btn-ghost" onClick={loadSample}>Load sample</button><label className="btn-ghost cursor-pointer">Upload .txt<input type="file" accept=".txt,text/plain" className="hidden" onChange={e=>upload(e.target.files?.[0])}/></label></div>
  </div>
  {fileError&&<p role="alert" className="text-xs text-red-400">{fileError}</p>}
  <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] gap-4">
   <div className="min-w-0"><div className="rounded-lg border border-[#1e2535] bg-[#070b14] overflow-hidden flex font-mono text-xs"><div aria-hidden className="select-none text-right text-[#45536b] bg-[#0b1220] px-3 py-3 leading-6 min-w-10">{Array.from({length:lineCount},(_,i)=><div key={i} className={errorLines.has(i+1)?"text-red-400 bg-red-950/50":""}>{i+1}</div>)}</div><textarea aria-label="Assembly program" spellCheck={false} value={source} onChange={e=>setSource(e.target.value)} className="w-full min-h-64 resize-y bg-transparent text-[#dbeafe] p-3 leading-6 outline-none"/></div>
    <div className="flex justify-between items-center mt-3"><span className={result.errors.length?"text-red-400 text-xs":"text-emerald-400 text-xs"}>{result.errors.length?`${result.errors.length} error(s)`:`${result.program?.length??0} instruction(s) valid`}</span><button className="btn-primary" disabled={disabled||result.errors.length>0||!result.program?.length} onClick={()=>onRun(result)}>Run simulation →</button></div>
   </div>
   <div className="flex flex-col gap-3 min-w-0"><button className="text-left flex justify-between text-xs font-semibold text-[#a5b4cc]" onClick={()=>setShowIsa(!showIsa)}>Effective ISA <span>{showIsa?"−":"+"}</span></button>
    {showIsa&&<div className="max-h-64 overflow-auto rounded-lg border border-[#1e2535]"><table className="w-full text-xs"><thead><tr className="bg-[#101827] text-[#64748b]"><th className="p-2 text-left">Opcode</th><th className="p-2">Unit</th><th className="p-2">Latency</th><th className="p-2">Stations</th></tr></thead><tbody>{Object.entries(result.isa.opcodes).map(([name,op])=><tr key={name} className="border-t border-[#1e2535]"><td className="p-2 font-mono text-[#bfdbfe]">{name}</td><td className="p-2 text-center">{op.unit}</td><td className="p-2 text-center">{op.latency}</td><td className="p-2 text-center">{result.isa.units[op.unit]?.stations}</td></tr>)}</tbody></table></div>}
    <div className="rounded-lg bg-[#070b14] border border-[#1e2535] p-3 max-h-48 overflow-auto"><p className="text-[10px] uppercase tracking-widest text-[#61708b] mb-2">Validation</p>{!result.errors.length&&!result.warnings.length?<p className="text-xs text-emerald-400">No issues found.</p>:[...result.errors,...result.warnings].map((e,i)=><div key={i} className={result.errors.includes(e)?"text-xs text-red-300 mb-2":"text-xs text-amber-300 mb-2"}>Line {e.line}: {e.message}{e.hint&&<span className="block text-[#8392aa] pl-2">{e.hint}</span>}</div>)}</div>
   </div>
  </div>
 </section>;
}
