"use client";

import React, { useReducer, useEffect, useState } from "react";
import { simulatorReducer } from "@/lib/simulator";
import { buildInitialState, DEFAULT_INSTRUCTIONS, DEFAULT_REGISTER_FILE } from "@/lib/defaults";
import type { Instruction } from "@/lib/types";

import Controls from "@/components/Controls";
import InstructionTable from "@/components/InstructionTable";
import ReservationStationTable from "@/components/ReservationStationTable";
import RegisterStatusTable from "@/components/RegisterStatusTable";
import GanttTimeline from "@/components/GanttTimeline";
import CycleLog from "@/components/CycleLog";

const INITIAL_STATE = buildInitialState(
  DEFAULT_INSTRUCTIONS.map((i) => ({ ...i })),
  { ...DEFAULT_REGISTER_FILE }
);

export default function Home() {
  const [state, dispatch] = useReducer(simulatorReducer, INITIAL_STATE);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(500); // ms per step
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const isPlaying = playing && !state.done;

  // ── Auto-play interval ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      dispatch({ type: "STEP" });
    }, speed);

    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  function handleTogglePlay() {
    if (isPlaying) {
      setPlaying(false);
    } else if (!state.done) {
      setPlaying(true);
    }
  }

  function handleReset() {
    setPlaying(false);
    dispatch({ type: "RESET" });
    setSelectedId(null);
  }

  function handleUpdateInstructions(instrs: Instruction[]) {
    if (!state.started) {
      dispatch({ type: "SET_INSTRUCTIONS", payload: instrs });
    }
  }

  // Determine which RS the selected instruction is currently in
  const selectedRS = selectedId !== null
    ? state.reservationStations.find((rs) => rs.instructionId === selectedId)?.name ?? null
    : null;

  return (
    <main className="min-h-screen bg-[#060911] text-white">
      {/* ── Header ── */}
      <header className="border-b border-[#1e2535] bg-[#080c17]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#6ee7b7] flex items-center justify-center text-sm font-bold text-[#060911]">
              T
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Tomasulo Visualizer
              </h1>
              <p className="text-[10px] text-[#3d4b63] uppercase tracking-widest">
                Out-of-order execution simulator
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 text-xs text-[#3d4b63]">
            <span className="px-2 py-1 rounded bg-[#0f1520] border border-[#1e2535]">
              ADD/SUB 2cy
            </span>
            <span className="px-2 py-1 rounded bg-[#0f1520] border border-[#1e2535]">
              MUL 10cy
            </span>
            <span className="px-2 py-1 rounded bg-[#0f1520] border border-[#1e2535]">
              DIV 20cy
            </span>
            <span className="px-2 py-1 rounded bg-[#0f1520] border border-[#1e2535]">
              LOAD 2cy
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-6 py-5 flex flex-col gap-5">
        {/* ── Controls ── */}
        <Controls
          cycle={state.cycle}
          done={state.done}
          started={state.started}
          playing={playing}
          speed={speed}
          onStep={() => dispatch({ type: "STEP" })}
          onTogglePlay={handleTogglePlay}
          onReset={handleReset}
          onSpeedChange={setSpeed}
        />

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-5">
          {/* Left column */}
          <div className="flex flex-col gap-5">
            <InstructionTable
              instructions={state.instructions}
              started={state.started}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onUpdate={handleUpdateInstructions}
            />
            <ReservationStationTable
              stations={state.reservationStations}
              highlightedRS={selectedRS}
            />
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            <RegisterStatusTable registerFile={state.registerFile} />
            <GanttTimeline
              instructions={state.instructions}
              currentCycle={state.cycle}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <CycleLog log={state.log} instructions={state.instructions} />
          </div>
        </div>
      </div>
    </main>
  );
}
