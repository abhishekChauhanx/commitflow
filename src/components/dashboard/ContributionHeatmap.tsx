"use client";

import { useState, useEffect } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";

type Day = { date: string; count: number };

export default function ContributionHeatmap() {
  const [days, setDays] = useState<Day[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/github/contributions")
      .then((res) => res.json())
      .then((data) => {
        setDays(data.days || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-gray-400 text-sm">Loading contribution graph...</p>;
  }

  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  return (
    <div className="border border-gray-800 rounded-lg p-5 bg-gray-900/30">
      <h3 className="text-sm text-gray-400 mb-4">
        {total} contributions in the last year
      </h3>
      <div className="heatmap-wrapper">
        <CalendarHeatmap
          startDate={oneYearAgo}
          endDate={today}
          values={days.map((d) => ({ date: d.date, count: d.count }))}
          classForValue={(value) => {
            if (!value || value.count === 0) return "color-empty";
            if (value.count < 2) return "color-scale-1";
            if (value.count < 4) return "color-scale-2";
            if (value.count < 6) return "color-scale-3";
            return "color-scale-4";
          }}
          showWeekdayLabels
        />
      </div>

      <style jsx global>{`
        .heatmap-wrapper .color-empty { fill: #1f2937; }
        .heatmap-wrapper .color-scale-1 { fill: #0e4429; }
        .heatmap-wrapper .color-scale-2 { fill: #006d32; }
        .heatmap-wrapper .color-scale-3 { fill: #26a641; }
        .heatmap-wrapper .color-scale-4 { fill: #39d353; }
        .heatmap-wrapper text { fill: #9ca3af; font-size: 8px; }
      `}</style>
    </div>
  );
}