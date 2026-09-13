"use client";

import React from "react";
import type { ReservationStation } from "@/lib/types";
import { RS_NAMES } from "@/lib/defaults";

interface RSTableProps {
  stations: ReservationStation[];
  highlightedRS: string | null;
}

function fmtVal(v: number | null): string {
  if (v === null) return "";
  return Number.isInteger(v) ? String(v) : v.toFixed(3);
}

function TagBadge({ tag }: { tag: string }) {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-[#1e3a5f] text-[#60a5fa] border border-[#2563eb]/40">
      {tag}
    </span>
  );
}

function RSRow({
  rs,
  highlighted,
}: {
  rs: ReservationStation;
  highlighted: boolean;
}) {
  const rowClass = highlighted
    ? "bg-[#0d2240] ring-1 ring-[#3b82f6]/60"
    : rs.busy
    ? "bg-[#0a1628]/60"
    : "";

  return (
    <tr
      id={`rs-row-${rs.name}`}
      className={`border-b border-[#141926] transition-all ${rowClass}`}
    >
      {/* Name */}
      <td className="td font-mono font-semibold text-[#e2e8f0]">{rs.name}</td>

      {/* Busy */}
      <td className="td text-center">
        {rs.busy ? (
          <span className="inline-block w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_6px_#34d399]" />
        ) : (
          <span className="inline-block w-2 h-2 rounded-full bg-[#1e2535]" />
        )}
      </td>

      {/* Op */}
      <td className="td">
        {rs.op && (
          <span className={`opcode-badge opcode-${rs.op}`}>{rs.op}</span>
        )}
      </td>

      {/* Vj */}
      <td className="td font-mono text-[#a5f3fc] text-right pr-3">
        {rs.Vj !== null ? fmtVal(rs.Vj) : ""}
      </td>

      {/* Vk */}
      <td className="td font-mono text-[#a5f3fc] text-right pr-3">
        {rs.Vk !== null ? fmtVal(rs.Vk) : ""}
      </td>

      {/* Qj */}
      <td className="td text-center">
        {rs.Qj ? <TagBadge tag={rs.Qj} /> : null}
      </td>

      {/* Qk */}
      <td className="td text-center">
        {rs.Qk ? <TagBadge tag={rs.Qk} /> : null}
      </td>

      {/* Progress */}
      <td className="td w-28">
        {rs.busy && rs.cyclesLeft !== null && (
          <div className="flex items-center gap-1.5">
            {rs.resultReady ? (
              <span className="text-[#34d399] text-xs font-semibold">Done ✓</span>
            ) : (
              <>
                <div className="flex-1 h-1.5 bg-[#1e2535] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#3b82f6] to-[#6ee7b7] rounded-full transition-all"
                    style={{
                      width: `${Math.max(
                        5,
                        (1 -
                          rs.cyclesLeft /
                            (rs.cyclesLeft + 0.001)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-[#8b9ab8] text-xs font-mono">{rs.cyclesLeft}</span>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

function PoolSection({
  title,
  names,
  stations,
  highlightedRS,
}: {
  title: string;
  names: string[];
  stations: ReservationStation[];
  highlightedRS: string | null;
}) {
  const poolStations = names.map(
    (n) => stations.find((s) => s.name === n)!
  );

  return (
    <>
      <tr className="bg-[#080c17]">
        <td
          colSpan={8}
          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#3d4b63]"
        >
          {title}
        </td>
      </tr>
      {poolStations.map((rs) => (
        <RSRow
          key={rs.name}
          rs={rs}
          highlighted={highlightedRS === rs.name}
        />
      ))}
    </>
  );
}

export default function ReservationStationTable({
  stations,
  highlightedRS,
}: RSTableProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="section-title">Reservation Stations</h2>
      <div className="overflow-x-auto rounded-xl border border-[#1e2535]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0b0e18] border-b border-[#1e2535]">
              <th className="th">Name</th>
              <th className="th text-center">Busy</th>
              <th className="th">Op</th>
              <th className="th text-right pr-3">Vj</th>
              <th className="th text-right pr-3">Vk</th>
              <th className="th text-center">Qj</th>
              <th className="th text-center">Qk</th>
              <th className="th">Progress</th>
            </tr>
          </thead>
          <tbody>
            <PoolSection
              title="Add / Sub (latency 2)"
              names={RS_NAMES.ADD}
              stations={stations}
              highlightedRS={highlightedRS}
            />
            <PoolSection
              title="Multiply / Divide (latency 10 / 20)"
              names={RS_NAMES.MULT}
              stations={stations}
              highlightedRS={highlightedRS}
            />
            <PoolSection
              title="Load / Store Buffers (latency 2)"
              names={RS_NAMES.LOAD}
              stations={stations}
              highlightedRS={highlightedRS}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
