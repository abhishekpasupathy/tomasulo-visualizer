"use client";
import React,{useEffect,useReducer,useState} from "react";
import {simulatorReducer} from "@/lib/simulator";
import {buildInitialState,DEFAULT_INSTRUCTIONS,DEFAULT_REGISTER_FILE} from "@/lib/defaults";
import type {Instruction} from "@/lib/types";
import {DEFAULT_ISA} from "@/lib/isa";
import ProgramInput from "@/components/ProgramInput";
import type {ParseResult} from "@/lib/parser";
import Controls from "@/components/Controls";
import InstructionTable from "@/components/InstructionTable";
import ReservationStationTable from "@/components/ReservationStationTable";
import RegisterStatusTable from "@/components/RegisterStatusTable";
import GanttTimeline from "@/components/GanttTimeline";
import CycleLog from "@/components/CycleLog";
const INITIAL_STATE=buildInitialState(DEFAULT_INSTRUCTIONS,{...DEFAULT_REGISTER_FILE},DEFAULT_ISA);
export default function Home(){
 const [state,dispatch]=useReducer(simulatorReducer,INITIAL_STATE),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(500),[selectedId,setSelectedId]=useState<number|null>(null);
 const isPlaying=playing&&!state.done;
 useEffect(()=>{if(!isPlaying)return;const timer=setInterval(()=>dispatch({type:"STEP"}),speed);return()=>clearInterval(timer);},[isPlaying,speed]);
 function reset(){setPlaying(false);dispatch({type:"RESET"});setSelectedId(null);}
 function run(result:ParseResult){if(!result.program||result.errors.length)return;setPlaying(false);dispatch({type:"SET_PROGRAM",payload:{instructions:result.program as Instruction[],isa:result.isa}});setSelectedId(null);}
 const selectedRS=selectedId!==null?state.reservationStations.find(r=>r.instructionId===selectedId)?.name??null:null;
 return <main className="min-h-screen bg-[#060911] text-white">
  <header className="sticky top-0 z-50 border-b border-[#1e2535] bg-[#080c17]/90 backdrop-blur-sm"><div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#6ee7b7] flex items-center justify-center text-sm font-bold text-[#060911]">T</div><div><h1 className="text-lg font-bold">Tomasulo Visualizer</h1><p className="text-[10px] text-[#3d4b63] uppercase tracking-widest">Out-of-order execution simulator</p></div><span className="ml-auto text-xs text-[#61708b]">ISA-configurable execution</span></div></header>
  <div className="max-w-screen-2xl mx-auto px-6 py-5 flex flex-col gap-5">
   <ProgramInput onRun={run}/>
   <Controls cycle={state.cycle} done={state.done} started={state.started} playing={playing} speed={speed} onStep={()=>dispatch({type:"STEP"})} onTogglePlay={()=>setPlaying(v=>!v)} onReset={reset} onSpeedChange={setSpeed}/>
   <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-5"><div className="flex flex-col gap-5"><InstructionTable instructions={state.instructions} started={state.started} selectedId={selectedId} onSelect={setSelectedId} onUpdate={v=>{if(!state.started)dispatch({type:"SET_INSTRUCTIONS",payload:v});}}/><ReservationStationTable stations={state.reservationStations} highlightedRS={selectedRS}/></div><div className="flex flex-col gap-5"><RegisterStatusTable registerFile={state.registerFile}/><GanttTimeline instructions={state.instructions} currentCycle={state.cycle} selectedId={selectedId} onSelect={setSelectedId}/><CycleLog log={state.log} instructions={state.instructions}/></div></div>
  </div>
 </main>;
}
