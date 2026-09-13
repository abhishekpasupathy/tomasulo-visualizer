"use client";

import React from "react";
import type { Instruction } from "@/lib/types";

interface GanttTimelineProps {
  instructions: Instruction[];
  currentCycle: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

const CELL_W = 28; // px per cycle column
const ROW_H = 36;
const LABEL_W = 160;
const HEADER_H = 28;

const PHASE_COLORS = {
  issue: { fill: "#1d4ed8", stroke: "#3b82f6", label: "Issue" },
  exec: { fill: "#065f46", stroke: "#34d399", label: "Execute" },
  wb: { fill: "#7c2d12", stroke: "#fb923c", label: "WB" },
  current: { fill: "none", stroke: "#4ade80" },
};

function instrLabel(instr: Instruction): string {
  if (instr.opcode === "LOAD" || instr.opcode === "STORE") {
    return `${instr.opcode} ${instr.dest}, ${instr.src1}(${instr.src2})`;
  }
  return `${instr.opcode} ${instr.dest}, ${instr.src1}, ${instr.src2}`;
}

export default function GanttTimeline({
  instructions,
  currentCycle,
  selectedId,
  onSelect,
}: GanttTimelineProps) {
  if (currentCycle === 0) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="section-title">Gantt Timeline</h2>
        <div className="rounded-xl border border-[#1e2535] bg-[#080c17] flex items-center justify-center h-28 text-[#3d4b63] text-sm">
          Timeline will appear after the first step
        </div>
      </div>
    );
  }

  // Determine total cycles to display (at least up to current cycle)
  const maxCycle = Math.max(
    currentCycle + 2,
    ...instructions.map((i) => i.writebackCycle ?? i.execEndCycle ?? i.issueCycle ?? 0)
  );

  const cycles = Array.from({ length: maxCycle }, (_, i) => i + 1);
  const svgW = LABEL_W + cycles.length * CELL_W + 8;
  const svgH = HEADER_H + instructions.length * ROW_H + 8;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Gantt Timeline</h2>
        <div className="flex items-center gap-4 text-xs text-[#8b9ab8]">
          {[
            { color: "#3b82f6", label: "Issue" },
            { color: "#34d399", label: "Execute" },
            { color: "#fb923c", label: "WB" },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ background: color, opacity: 0.8 }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#1e2535] bg-[#080c17]">
        <svg
          width={svgW}
          height={svgH}
          className="font-mono"
          style={{ minWidth: svgW }}
        >
          {/* Header: cycle numbers */}
          <g>
            {cycles.map((c) => (
              <text
                key={c}
                x={LABEL_W + (c - 1) * CELL_W + CELL_W / 2}
                y={HEADER_H - 6}
                textAnchor="middle"
                fontSize={10}
                fill={c === currentCycle ? "#4ade80" : "#3d4b63"}
                fontWeight={c === currentCycle ? "bold" : "normal"}
              >
                {c}
              </text>
            ))}
          </g>

          {/* Grid lines */}
          {cycles.map((c) => (
            <line
              key={c}
              x1={LABEL_W + (c - 1) * CELL_W}
              y1={HEADER_H}
              x2={LABEL_W + (c - 1) * CELL_W}
              y2={svgH}
              stroke={c === currentCycle ? "#4ade80" : "#141926"}
              strokeWidth={c === currentCycle ? 1.5 : 1}
              strokeDasharray={c === currentCycle ? "none" : "2,2"}
              opacity={c === currentCycle ? 0.6 : 1}
            />
          ))}

          {/* Current cycle highlight column */}
          <rect
            x={LABEL_W + (currentCycle - 1) * CELL_W}
            y={HEADER_H}
            width={CELL_W}
            height={svgH - HEADER_H}
            fill="#4ade80"
            opacity={0.04}
          />

          {/* Instruction rows */}
          {instructions.map((instr, rowIdx) => {
            const y = HEADER_H + rowIdx * ROW_H;
            const isSelected = selectedId === instr.id;

            return (
              <g
                key={instr.id}
                onClick={() => onSelect(instr.id)}
                style={{ cursor: "pointer" }}
              >
                {/* Row background */}
                <rect
                  x={0}
                  y={y}
                  width={svgW}
                  height={ROW_H}
                  fill={isSelected ? "#0d2240" : rowIdx % 2 === 0 ? "#080c17" : "#090e1a"}
                  rx={0}
                />

                {/* Selected indicator */}
                {isSelected && (
                  <rect x={0} y={y} width={3} height={ROW_H} fill="#3b82f6" rx={1.5} />
                )}

                {/* Label */}
                <text
                  x={8}
                  y={y + ROW_H / 2 + 4}
                  fontSize={11}
                  fill={isSelected ? "#e2e8f0" : "#8b9ab8"}
                  fontFamily="monospace"
                >
                  {instrLabel(instr)}
                </text>

                {/* Issue bar */}
                {instr.issueCycle !== null && (
                  <rect
                    x={LABEL_W + (instr.issueCycle - 1) * CELL_W + 2}
                    y={y + 6}
                    width={CELL_W - 4}
                    height={ROW_H - 12}
                    fill={PHASE_COLORS.issue.fill}
                    stroke={PHASE_COLORS.issue.stroke}
                    strokeWidth={1}
                    rx={3}
                    opacity={0.9}
                  />
                )}

                {/* Execute bar (spans execStartCycle → execEndCycle) */}
                {instr.execStartCycle !== null && (
                  <rect
                    x={LABEL_W + (instr.execStartCycle - 1) * CELL_W + 2}
                    y={y + 6}
                    width={
                      ((instr.execEndCycle ?? currentCycle) -
                        instr.execStartCycle +
                        1) *
                        CELL_W -
                      4
                    }
                    height={ROW_H - 12}
                    fill={PHASE_COLORS.exec.fill}
                    stroke={PHASE_COLORS.exec.stroke}
                    strokeWidth={1}
                    rx={3}
                    opacity={0.9}
                  />
                )}

                {/* Writeback bar */}
                {instr.writebackCycle !== null && (
                  <rect
                    x={LABEL_W + (instr.writebackCycle - 1) * CELL_W + 2}
                    y={y + 6}
                    width={CELL_W - 4}
                    height={ROW_H - 12}
                    fill={PHASE_COLORS.wb.fill}
                    stroke={PHASE_COLORS.wb.stroke}
                    strokeWidth={1}
                    rx={3}
                    opacity={0.9}
                  />
                )}

                {/* Row separator */}
                <line
                  x1={0}
                  y1={y + ROW_H}
                  x2={svgW}
                  y2={y + ROW_H}
                  stroke="#141926"
                  strokeWidth={1}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
