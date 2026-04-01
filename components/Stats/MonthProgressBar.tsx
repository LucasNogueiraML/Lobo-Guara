// components/stats/MonthProgressBar.tsx
import React from "react";

type Props = {
  /** mostra texto com dias restantes (true por padrão) */
  showDaysLeft?: boolean;
  /** cor da parte preenchida */
  color?: string;
  /** altura da barra em px */
  height?: number;
};

export default function MonthProgressBar({
  showDaysLeft = true,
  color = "#10b981",
  height = 12,
}: Props) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-index
  // total de dias no mês atual
  const totalDays = new Date(year, month + 1, 0).getDate();
  const dayOfMonth = now.getDate(); // 1..totalDays
  const daysPassed = dayOfMonth - 1; // dias completos já passados
  const daysLeft = Math.max(0, totalDays - dayOfMonth);
  const percentPassed = Math.round((daysPassed / totalDays) * 100);

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentPassed}
        style={{
          flex: 1,
          background: "#e6e6e6",
          borderRadius: 9999,
          height,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentPassed}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${color}, #06b6d4)`,
            borderRadius: 9999,
            transition: "width 400ms ease",
          }}
        />
        {/* marcadores semanais (opcional, sutis) */}
        <div style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          display: "flex",
          justifyContent: "space-between",
          opacity: 0.12,
        }}>
          {[0,1,2,3].map(i => <div key={i} style={{ width: 1, background: "#000" }} />)}
        </div>
      </div>

      {showDaysLeft && (
        <div style={{ minWidth: 120, textAlign: "right" }}>
          <div style={{ fontWeight: 700 }}>{daysLeft} dias</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>para o mês acabar</div>
        </div>
      )}
    </div>
  );
}
