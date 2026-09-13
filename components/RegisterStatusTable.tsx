"use client";

import React from "react";
import type { RegisterFile } from "@/lib/types";

interface RegisterStatusTableProps {
  registerFile: RegisterFile;
}

const REGISTER_GROUPS = [
  { label: "Float", regs: ["F0", "F2", "F4", "F6", "F8", "F10"] },
  { label: "Int", regs: ["R2", "R3"] },
];

export default function RegisterStatusTable({
  registerFile,
}: RegisterStatusTableProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="section-title">Register Status</h2>

      <div className="flex flex-col gap-3">
        {REGISTER_GROUPS.map(({ label, regs }) => (
          <div key={label} className="rounded-xl border border-[#1e2535] overflow-hidden">
            <div className="bg-[#0b0e18] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#3d4b63] border-b border-[#1e2535]">
              {label} Registers
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0b0e18]/60 border-b border-[#141926]">
                    {regs.map((r) => (
                      <th key={r} className="th text-center px-4">
                        {r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {regs.map((reg) => {
                      const entry = registerFile[reg];
                      if (!entry) {
                        return (
                          <td key={reg} className="td text-center text-[#3d4b63]">
                            —
                          </td>
                        );
                      }
                      if (entry.kind === "value") {
                        return (
                          <td key={reg} className="td text-center">
                            <span className="font-mono text-[#a5f3fc] font-semibold">
                              {Number.isInteger(entry.value)
                                ? entry.value
                                : entry.value.toFixed(3)}
                            </span>
                          </td>
                        );
                      }
                      // pending
                      return (
                        <td key={reg} className="td text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-block px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-[#1e3a5f] text-[#60a5fa] border border-[#2563eb]/40 animate-pulse">
                              {entry.qi}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
