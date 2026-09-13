"use client";

import React from "react";
import type { Instruction, Opcode } from "@/lib/types";

const OPCODES: Opcode[] = ["ADD", "SUB", "MUL", "DIV", "LOAD", "STORE"];

interface InstructionTableProps {
  instructions: Instruction[];
  started: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onUpdate: (instructions: Instruction[]) => void;
}

function emptyInstruction(id: number): Instruction {
  return {
    id,
    opcode: "ADD",
    dest: "",
    src1: "",
    src2: "",
    issueCycle: null,
    execStartCycle: null,
    execEndCycle: null,
    writebackCycle: null,
  };
}

function cycleCell(val: number | null) {
  if (val === null)
    return <span className="text-[#3d4b63]">—</span>;
  return (
    <span className="font-mono text-[#a5f3fc] font-semibold">{val}</span>
  );
}

export default function InstructionTable({
  instructions,
  started,
  selectedId,
  onSelect,
  onUpdate,
}: InstructionTableProps) {
  function updateField(
    id: number,
    field: "opcode" | "dest" | "src1" | "src2",
    value: string
  ) {
    const updated = instructions.map((i) =>
      i.id === id ? { ...i, [field]: value } : i
    );
    onUpdate(updated);
  }

  function addRow() {
    const next = emptyInstruction(instructions.length);
    onUpdate([...instructions, next]);
  }

  function removeRow(id: number) {
    const filtered = instructions
      .filter((i) => i.id !== id)
      .map((i, idx) => ({ ...i, id: idx }));
    onUpdate(filtered);
  }

  const isEditable = !started;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Instructions</h2>
        {isEditable && (
          <button
            id="btn-add-instruction"
            onClick={addRow}
            className="btn-ghost text-xs py-1 px-2"
          >
            + Add row
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#1e2535]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0b0e18] border-b border-[#1e2535]">
              <th className="th w-6 text-center">#</th>
              <th className="th">Opcode</th>
              <th className="th">Dest</th>
              <th className="th">Src1 / Offset</th>
              <th className="th">Src2 / Base</th>
              <th className="th text-center text-[#60a5fa]">Issue</th>
              <th className="th text-center text-[#34d399]">Exec Start</th>
              <th className="th text-center text-[#34d399]">Exec End</th>
              <th className="th text-center text-[#fb923c]">WB</th>
              {isEditable && <th className="th w-6" />}
            </tr>
          </thead>
          <tbody>
            {instructions.map((instr, idx) => {
              const isSelected = selectedId === instr.id;
              const rowBase = isSelected
                ? "bg-[#0d2240] border-l-2 border-l-[#3b82f6]"
                : "border-l-2 border-l-transparent hover:bg-[#0f1520]";

              return (
                <tr
                  key={instr.id}
                  id={`instr-row-${instr.id}`}
                  onClick={() => onSelect(instr.id)}
                  className={`cursor-pointer transition-colors border-b border-[#141926] ${rowBase}`}
                >
                  <td className="td text-center text-[#3d4b63] font-mono">
                    {idx + 1}
                  </td>

                  {/* Opcode */}
                  <td className="td">
                    {isEditable ? (
                      <select
                        value={instr.opcode}
                        onChange={(e) =>
                          updateField(instr.id, "opcode", e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="input-cell w-full"
                        id={`instr-opcode-${instr.id}`}
                      >
                        {OPCODES.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`opcode-badge opcode-${instr.opcode}`}>
                        {instr.opcode}
                      </span>
                    )}
                  </td>

                  {/* Dest */}
                  <td className="td">
                    {isEditable ? (
                      <input
                        value={instr.dest}
                        onChange={(e) =>
                          updateField(instr.id, "dest", e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        placeholder="F0"
                        className="input-cell w-16"
                        id={`instr-dest-${instr.id}`}
                      />
                    ) : (
                      <span className="font-mono text-[#e2e8f0]">
                        {instr.dest}
                      </span>
                    )}
                  </td>

                  {/* Src1 */}
                  <td className="td">
                    {isEditable ? (
                      <input
                        value={instr.src1}
                        onChange={(e) =>
                          updateField(instr.id, "src1", e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        placeholder="F2 or 34"
                        className="input-cell w-20"
                        id={`instr-src1-${instr.id}`}
                      />
                    ) : (
                      <span className="font-mono text-[#94a3b8]">
                        {instr.src1}
                      </span>
                    )}
                  </td>

                  {/* Src2 */}
                  <td className="td">
                    {isEditable ? (
                      <input
                        value={instr.src2}
                        onChange={(e) =>
                          updateField(instr.id, "src2", e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        placeholder="F4 or R2"
                        className="input-cell w-20"
                        id={`instr-src2-${instr.id}`}
                      />
                    ) : (
                      <span className="font-mono text-[#94a3b8]">
                        {instr.src2}
                      </span>
                    )}
                  </td>

                  {/* Timing columns */}
                  <td className="td text-center">{cycleCell(instr.issueCycle)}</td>
                  <td className="td text-center">{cycleCell(instr.execStartCycle)}</td>
                  <td className="td text-center">{cycleCell(instr.execEndCycle)}</td>
                  <td className="td text-center">{cycleCell(instr.writebackCycle)}</td>

                  {/* Remove */}
                  {isEditable && (
                    <td className="td">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRow(instr.id);
                        }}
                        className="text-[#3d4b63] hover:text-red-400 transition-colors"
                        title="Remove"
                        id={`btn-remove-${instr.id}`}
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
