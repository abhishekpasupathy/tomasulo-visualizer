import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tomasulo Visualizer — Out-of-Order Execution Simulator",
  description:
    "An interactive, step-through simulator of Tomasulo's algorithm for out-of-order instruction execution. Designed as a teaching tool for computer architecture courses.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#060911]">{children}</body>
    </html>
  );
}
