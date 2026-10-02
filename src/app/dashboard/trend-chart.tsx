"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type TrendPoint = { label: string; debito: number; credito: number };

export type DonutSlice = { label: string; value: number };

/** Línea de tendencia de la cuota por período. */
export function CuotaChart({ data }: { data: { label: string; cuota: number }[] }) {
  const options: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: { enabled: true, speed: 600 },
    },
    colors: ["#352574"],
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.35, opacityTo: 0.05 },
    },
    stroke: { curve: "smooth", width: 2.5 },
    markers: { size: 4, colors: ["#352574"], strokeColors: "#fff", strokeWidth: 2 },
    dataLabels: { enabled: false },
    grid: { borderColor: "#dedfed" },
    xaxis: {
      categories: data.map((d) => d.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#494d83", fontFamily: "monospace" } },
    },
    yaxis: {
      labels: {
        style: { colors: "#494d83" },
        formatter: (v: number) =>
          v >= 1000 ? `${fmtVe(Math.round(v / 100) / 10)} k` : fmtVe(v),
      },
    },
    tooltip: { y: { formatter: (v: number) => fmtVe(v ?? 0) } },
    legend: { show: false },
  };
  return (
    <Chart
      options={options}
      series={[{ name: "Cuota del período", data: data.map((d) => d.cuota) }]}
      type="area"
      height={240}
    />
  );
}

/** Barras de retenciones IVA vs ISLR por período. */
export function RetencionesChart({
  data,
}: {
  data: { label: string; iva: number; islr: number }[];
}) {
  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: { enabled: true, speed: 600 },
    },
    colors: ["#37c8a1", "#217861"],
    plotOptions: {
      bar: { borderRadius: 3, columnWidth: "45%", borderRadiusApplication: "end" },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: "#dedfed", strokeDashArray: 0 },
    xaxis: {
      categories: data.map((d) => d.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#494d83", fontFamily: "monospace" } },
    },
    yaxis: {
      labels: {
        style: { colors: "#494d83" },
        formatter: (v: number) =>
          v >= 1000 ? `${fmtVe(Math.round(v / 100) / 10)} k` : fmtVe(v),
      },
    },
    tooltip: { y: { formatter: (v: number) => fmtVe(v ?? 0) } },
    legend: { show: false },
  };
  return (
    <div>
      <Chart
        options={options}
        series={[
          { name: "IVA retenido", data: data.map((d) => d.iva) },
          { name: "ISLR retenido", data: data.map((d) => d.islr) },
        ]}
        type="bar"
        height={240}
      />
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-periwinkle-500">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm bg-[#37c8a1]" aria-hidden />
          IVA retenido
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm bg-[#217861]" aria-hidden />
          ISLR retenido
        </span>
      </div>
    </div>
  );
}
/** Dona de composición. Mismo % visible y accesible vía etiquetas. */
export function CompositionDonut({ data }: { data: DonutSlice[] }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const options: ApexOptions = {
    chart: { type: "donut", fontFamily: "inherit", animations: { enabled: true, speed: 600 } },
    colors: ["#352574", "#37c8a1", "#9da0c8", "#afe9da"],
    labels: data.map((d) => d.label),
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)} %`,
      style: { fontSize: "11px", colors: ["#fff"] },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "62%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Base total",
              fontSize: "11px",
              color: "#494d83",
              formatter: () => fmtVe(total),
            },
          },
        },
      },
    },
    stroke: { width: 2, colors: ["#ffffff"] },
    tooltip: { y: { formatter: (v: number) => fmtVe(v ?? 0) } },
    legend: { position: "bottom", fontSize: "12px", labels: { colors: "#494d83" } },
  };
  return (
    <Chart
      options={options}
      series={data.map((d) => d.value)}
      type="donut"
      height={260}
    />
  );
}

/** "1234.56" → "1.234,56" (presentación es-VE). */
function fmtVe(n: number): string {
  const [int = "0", dec = "00"] = n.toFixed(2).split(".");
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec}`;
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: { enabled: true, speed: 600 },
    },
    colors: ["#352574", "#37c8a1"],
    plotOptions: {
      bar: { borderRadius: 3, columnWidth: "45%", borderRadiusApplication: "end" },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: "#dedfed", strokeDashArray: 0 },
    xaxis: {
      categories: data.map((d) => d.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#494d83", fontFamily: "monospace" } },
    },
    yaxis: {
      labels: {
        style: { colors: "#494d83" },
        formatter: (v: number) =>
          v >= 1000 ? `${fmtVe(Math.round(v / 100) / 10)} k` : fmtVe(v),
      },
    },
    tooltip: {
      y: { formatter: (v: number) => fmtVe(v ?? 0) },
    },
    legend: { show: false },
  };
  const series = [
    { name: "Débito fiscal", data: data.map((d) => d.debito) },
    { name: "Crédito fiscal", data: data.map((d) => d.credito) },
  ];
  return (
    <div>
      <Chart options={options} series={series} type="bar" height={240} />
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-periwinkle-500">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm bg-[#352574]" aria-hidden />
          Débito fiscal
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm bg-[#37c8a1]" aria-hidden />
          Crédito fiscal
        </span>
      </div>
    </div>
  );
}
