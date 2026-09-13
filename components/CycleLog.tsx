"use client";

import React, { useEffect, useRef } from "react";
import type { LogEntry, Instruction } from "@/lib/types";

interface CycleLogProps {
  log: LogEntry[];
  instructions: Instruction[];
}

const EVENT_STYLES: Record<LogEntry["kind"], { icon: string; color: string }> = {
  issued: { icon: "→", color: "#60a5fa" },
  execStart: { icon: "▶", color: "#34d399" },
  execEnd: { icon: "✓", color: "#6ee7b7" },
  writeback: { icon: "⟲", color: "#fb923c" },
  cdbStall: { icon: "⏸", color: "#facc15" },
};

function instrName(instructions: Instruction[], id: number): string {
  const instr = instructions.find((i) => i.id === id);
  if (!instr) return `I${id}`;
  return `${instr.opcode} ${instr.dest}`;
}

export default function CycleLog({ log, instructions }: CycleLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log.length]);

  // Group log entries by cycle
  const byCycle = new Map<number, LogEntry[]>();
  for (const entry of log) {
    if (!byCycle.has(entry.cycle)) byCycle.set(entry.cycle, []);
    byCycle.get(entry.cycle)!.push(entry);
  }
  const cycles = Array.from(byCycle.keys()).sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="section-title">Cycle Log</h2>
      <div
        id="cycle-log-scroll"
        className="h-64 overflow-y-auto rounded-xl border border-[#1e2535] bg-[#080c17] p-3 flex flex-col gap-3 text-xs font-mono"
      >
        {cycles.length === 0 && (
          <span className="text-[#3d4b63] italic">
            No events yet — press Step or Play to begin
          </span>
        )}

        {cycles.map((cycle) => (
          <div key={cycle} className="flex flex-col gap-1">
            <div className="text-[#3d4b63] text-[10px] uppercase tracking-widest mb-0.5">
              ── Cycle {cycle} ──
            </div>
            {byCycle.get(cycle)!.map((entry, i) => {
              const style = EVENT_STYLES[entry.kind];
              return (
                <div
                  key={i}
                  className="flex items-start gap-2"
                  id={`log-${cycle}-${i}`}
                >
                  <span style={{ color: style.color }} className="shrink-0">
                    {style.icon}
                  </span>
                  <span className="text-[#8b9ab8]">
                    <span style={{ color: style.color }}>
                      {instrName(instructions, entry.instructionId)}
                    </span>{" "}
                    {entry.detail}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
