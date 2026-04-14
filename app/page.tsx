"use client";

import type { ReactNode, RefObject } from "react";
import { useId, useMemo, useRef, useState } from "react";

type SurfacePreset = {
  id: string;
  label: string;
  surface: string;
  grid: string;
};

const surfacePresets: SurfacePreset[] = [
  { id: "classic", label: "Classic", surface: "#0a6a60", grid: "#093d38" },
  { id: "mono", label: "Monochrome", surface: "#111111", grid: "#464646" },
  { id: "neutral", label: "Neutral", surface: "#6f6f72", grid: "#2b2b2d" },
  { id: "red", label: "Dark Red", surface: "#7b0909", grid: "#2c0606" },
  { id: "blue", label: "Blue", surface: "#113f9d", grid: "#081734" },
  { id: "orange", label: "Warm Orange", surface: "#ff4d16", grid: "#4d1204" },
  { id: "pink", label: "Pink", surface: "#d36aa6", grid: "#602744" },
  { id: "teal", label: "Teal", surface: "#0f8176", grid: "#08342f" },
];

const radiusDefaults = [10, 20, 30];

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const parsed = Number.parseInt(value, 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getAngleGuideEnd(width: number, height: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const candidates: number[] = [];

  if (cos > 0) {
    candidates.push(width / cos);
  }

  if (sin > 0) {
    candidates.push(height / sin);
  }

  const distance = Math.min(...candidates);

  return {
    x: cos * distance,
    y: sin * distance,
  };
}

function ControlCard({
  title,
  children,
  description,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel rounded-[22px] p-4 md:p-5 ${className}`}>
      <div className="space-y-2">
        <h2 className="text-[1.5rem] leading-none tracking-[-0.05em] text-white md:text-[1.7rem]">
          {title}
        </h2>
        {description ? (
          <p className="max-w-[34ch] text-sm leading-6 text-white/42">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-5 border-t border-white/10 pt-4">{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 rounded-full border transition ${
        checked
          ? "border-white/20 bg-white/18"
          : "border-white/10 bg-white/8"
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition ${
          checked ? "left-7" : "left-1"
        }`}
      />
    </button>
  );
}

function Range({
  min,
  max,
  step,
  value,
  onChange,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step ?? 1}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="slider h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
    />
  );
}

function NumberField({
  value,
  onChange,
  min = 0,
  max = 999,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="field"
    />
  );
}

function CuttingMatPreview({
  width,
  height,
  surfaceColor,
  guideColor,
  showEdgeTicks,
  showNumericGuides,
  showGrid,
  gridOpacity,
  showRadiusGuides,
  showTickMarks,
  angleGuides,
  angularSpacing,
  radii,
  svgRef,
  typography,
}: {
  width: number;
  height: number;
  surfaceColor: string;
  guideColor: string;
  showEdgeTicks: boolean;
  showNumericGuides: boolean;
  showGrid: boolean;
  gridOpacity: number;
  showRadiusGuides: boolean;
  showTickMarks: boolean;
  angleGuides: boolean;
  angularSpacing: number;
  radii: number[];
  svgRef: RefObject<SVGSVGElement | null>;
  typography: string;
}) {
  const framePad = 1;
  const matPadX = 3;
  const matPadTop = 4;
  const matPadBottom = 2;
  const viewWidth = width + matPadX * 2 + framePad * 2;
  const viewHeight = height + matPadTop + matPadBottom + framePad * 2;
  const majorStroke = 0.075;
  const minorStroke = 0.032;
  const matX = framePad;
  const matY = framePad;
  const matWidth = width + matPadX * 2;
  const matHeight = height + matPadTop + matPadBottom;
  const gridX = matX + matPadX;
  const gridY = matY + matPadTop;
  const gridRight = gridX + width;
  const gridBottom = gridY + height;
  const tickShort = 0.42;
  const tickLong = 0.84;
  const topLabelY = gridY - tickLong - 0.18;
  const bottomLabelY = matY + matHeight - 0.22;
  const leftLabelX = matX + 1.35;
  const rightLabelX = matX + matWidth - 1.35;
  const guideInk = "#180d08";
  const textInk = "#160d09";
  const angleDash = "0.16 0.18";

  const angleLines = useMemo(() => {
    if (!angleGuides) {
      return [];
    }

    const lines: number[] = [];
    for (let angle = angularSpacing; angle < 90; angle += angularSpacing) {
      lines.push(angle);
    }
    return lines;
  }, [angleGuides, angularSpacing]);

  const fontFamily =
    typography === "IBM Plex Mono"
      ? '"IBM Plex Mono", ui-monospace, monospace'
      : typography === "Space Mono"
        ? '"Space Mono", ui-monospace, monospace'
        : "var(--font-mono), monospace";

  return (
    <div className="mat-shell">
      <div className="mat-stage">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          className="h-full w-full"
          aria-label="Cutting mat preview"
          style={{ fontFamily }}
        >
          <defs>
            <filter id="matShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="1.4"
                stdDeviation="1.6"
                floodOpacity="0.25"
              />
            </filter>
          </defs>

          <rect
            x={matX}
            y={matY}
            width={matWidth}
            height={matHeight}
            rx="1"
            fill={surfaceColor}
            filter="url(#matShadow)"
          />

          {showGrid
            ? Array.from({ length: width + 1 }, (_, index) => (
                <line
                  key={`vx-${index}`}
                  x1={gridX + index}
                  x2={gridX + index}
                  y1={gridY}
                  y2={gridBottom}
                  stroke={guideColor}
                  opacity={index % 5 === 0 ? gridOpacity : gridOpacity * 0.45}
                  strokeWidth={index % 5 === 0 ? majorStroke : minorStroke}
                />
              ))
            : null}

          {showGrid
            ? Array.from({ length: height + 1 }, (_, index) => (
                <line
                  key={`hz-${index}`}
                  x1={gridX}
                  x2={gridRight}
                  y1={gridY + index}
                  y2={gridY + index}
                  stroke={guideColor}
                  opacity={index % 5 === 0 ? gridOpacity : gridOpacity * 0.45}
                  strokeWidth={index % 5 === 0 ? majorStroke : minorStroke}
                />
              ))
            : null}

          {showRadiusGuides
            ? radii.map((radius) => (
                <path
                  key={radius}
                  d={`M ${gridX} ${gridBottom - radius} A ${radius} ${radius} 0 0 0 ${
                    gridX + radius
                  } ${gridBottom}`}
                  fill="none"
                  stroke={guideColor}
                  strokeWidth="0.065"
                  opacity="0.78"
                />
              ))
            : null}

          {showRadiusGuides
            ? radii.map((radius, index) => (
                <text
                  key={`radius-label-${radius}`}
                  x={gridX + radius}
                  y={gridBottom - 1.5 - index * 0.15}
                  fontSize="0.7"
                  fill={textInk}
                  opacity="0.82"
                  textAnchor="middle"
                >
                  R{index + 1}
                </text>
              ))
            : null}

          {angleLines.map((angle) => {
            const radians = (angle * Math.PI) / 180;
            const end = getAngleGuideEnd(width, height, angle);
            const labelDistance = Math.min(width, height) * 0.16;

            return (
              <g key={angle}>
                <line
                  x1={gridX}
                  y1={gridBottom}
                  x2={gridX + end.x}
                  y2={gridBottom - end.y}
                  stroke={guideInk}
                  strokeDasharray={angleDash}
                  strokeWidth="0.065"
                  opacity="0.56"
                />
                <text
                  x={gridX + Math.cos(radians) * labelDistance}
                  y={gridBottom - Math.sin(radians) * labelDistance}
                  fontSize="0.72"
                  fill={textInk}
                  opacity="0.86"
                >
                  {angle}°
                </text>
              </g>
            );
          })}

          {showNumericGuides
            ? Array.from({ length: Math.floor(width / 5) + 1 }, (_, index) => {
                return (
                  <g key={`x-label-${index}`}>
                    <text
                      x={gridX + index * 5}
                      y={topLabelY}
                      fontSize="0.74"
                      fill={textInk}
                      textAnchor="middle"
                    >
                      {index * 5}
                    </text>
                    <text
                      x={gridX + index * 5}
                      y={bottomLabelY}
                      fontSize="0.74"
                      fill={textInk}
                      textAnchor="middle"
                      dominantBaseline="ideographic"
                    >
                      {index * 5}
                    </text>
                  </g>
                );
              })
            : null}

          {showNumericGuides
            ? Array.from({ length: Math.floor(height / 5) + 1 }, (_, index) => {
                const y = gridBottom - index * 5;
                return (
                  <g key={`side-${index}`}>
                    <text
                      x={leftLabelX}
                      y={y + 0.2}
                      fontSize="0.74"
                      fill={textInk}
                      textAnchor="end"
                    >
                      {index * 5}
                    </text>
                    <text
                      x={rightLabelX}
                      y={y + 0.2}
                      fontSize="0.74"
                      fill={textInk}
                      textAnchor="start"
                    >
                      {index * 5}
                    </text>
                  </g>
                );
              })
            : null}

          {showEdgeTicks
            ? Array.from({ length: width + 1 }, (_, index) => {
                const longTick = index % 5 === 0;
                const x = gridX + index;
                return (
                  <g key={`tick-x-${index}`}>
                    <line
                      x1={x}
                      x2={x}
                      y1={gridY - (longTick ? tickLong : tickShort)}
                      y2={gridY}
                      stroke={guideInk}
                      strokeWidth="0.06"
                      opacity="0.6"
                    />
                    <line
                      x1={x}
                      x2={x}
                      y1={gridBottom}
                      y2={gridBottom + (longTick ? tickLong : tickShort)}
                      stroke={guideInk}
                      strokeWidth="0.06"
                      opacity="0.6"
                    />
                  </g>
                );
              })
            : null}

          {showEdgeTicks
            ? Array.from({ length: height + 1 }, (_, index) => {
                const longTick = index % 5 === 0;
                const y = gridY + index;
                return (
                  <g key={`tick-y-${index}`}>
                    <line
                      x1={gridX - (longTick ? tickLong : tickShort)}
                      x2={gridX}
                      y1={y}
                      y2={y}
                      stroke={guideInk}
                      strokeWidth="0.06"
                      opacity="0.6"
                    />
                    <line
                      x1={gridRight}
                      x2={gridRight + (longTick ? tickLong : tickShort)}
                      y1={y}
                      y2={y}
                      stroke={guideInk}
                      strokeWidth="0.06"
                      opacity="0.6"
                    />
                  </g>
                );
              })
            : null}

          {showTickMarks
            ? radii.map((radius) => {
                const marks = Math.max(2, Math.floor(90 / angularSpacing));
                return Array.from({ length: marks + 1 }, (_, index) => {
                  const angle = (index * 90) / marks;
                  const radians = (angle * Math.PI) / 180;
                  const x1 = gridX + Math.cos(radians) * (radius - 0.55);
                  const y1 = gridBottom - Math.sin(radians) * (radius - 0.55);
                  const x2 = gridX + Math.cos(radians) * (radius + 0.55);
                  const y2 = gridBottom - Math.sin(radians) * (radius + 0.55);

                  return (
                    <line
                      key={`${radius}-${angle}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={guideInk}
                      strokeWidth="0.06"
                      opacity="0.52"
                    />
                  );
                });
              })
            : null}
        </svg>
      </div>
    </div>
  );
}

export default function Home() {
  const [unit, setUnit] = useState("cm");
  const [width, setWidth] = useState(50);
  const [height, setHeight] = useState(35);
  const [preset, setPreset] = useState("orange");
  const presetConfig =
    surfacePresets.find((option) => option.id === preset) ?? surfacePresets[5];
  const [surfaceColor, setSurfaceColor] = useState(presetConfig.surface);
  const [guideColor, setGuideColor] = useState(presetConfig.grid);
  const [showEdgeTicks, setShowEdgeTicks] = useState(true);
  const [showNumericGuides, setShowNumericGuides] = useState(true);
  const [typography, setTypography] = useState("Geist");
  const [showGrid, setShowGrid] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(90);
  const [showRadiusGuides, setShowRadiusGuides] = useState(true);
  const [radii, setRadii] = useState(radiusDefaults);
  const [showTickMarks, setShowTickMarks] = useState(true);
  const [angularSpacing, setAngularSpacing] = useState(15);
  const [angleGuides, setAngleGuides] = useState(true);
  const [format, setFormat] = useState("SVG");
  const [isExporting, setIsExporting] = useState(false);
  const surfaceColorId = useId();
  const guideColorId = useId();
  const svgRef = useRef<SVGSVGElement>(null);

  const surfaceRgb = hexToRgb(surfaceColor);

  const handlePresetChange = (nextPreset: SurfacePreset) => {
    setPreset(nextPreset.id);
    setSurfaceColor(nextPreset.surface);
    setGuideColor(nextPreset.grid);
  };

  const exportSummary = useMemo(
    () =>
      `${width}x${height}${unit} ${format.toLowerCase()} with ${showGrid ? "grid" : "no grid"}, ${angleGuides ? "angles" : "no angles"}`,
    [angleGuides, format, height, showGrid, unit, width],
  );

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = async () => {
    const svgNode = svgRef.current;

    if (!svgNode) {
      return;
    }

    setIsExporting(true);

    try {
      const serializer = new XMLSerializer();
      const svgMarkup = serializer.serializeToString(svgNode);
      const svgWithNamespace = svgMarkup.includes('xmlns="http://www.w3.org/2000/svg"')
        ? svgMarkup
        : svgMarkup.replace(
            "<svg",
            '<svg xmlns="http://www.w3.org/2000/svg"',
          );
      const fileBase = `cutting-mat-${width}x${height}${unit}`;

      if (format === "SVG") {
        downloadBlob(
          new Blob([svgWithNamespace], {
            type: "image/svg+xml;charset=utf-8",
          }),
          `${fileBase}.svg`,
        );
        return;
      }

      if (format === "PNG") {
        const svgBlob = new Blob([svgWithNamespace], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(svgBlob);
        const image = new Image();

        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("Unable to render PNG export."));
          image.src = url;
        });

        const viewBox = svgNode.viewBox.baseVal;
        const scale = 24;
        const canvas = document.createElement("canvas");
        canvas.width = viewBox.width * scale;
        canvas.height = viewBox.height * scale;
        const context = canvas.getContext("2d");

        if (!context) {
          URL.revokeObjectURL(url);
          throw new Error("Canvas export is not available in this browser.");
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const pngBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );

        URL.revokeObjectURL(url);

        if (!pngBlob) {
          throw new Error("Unable to encode PNG export.");
        }

        downloadBlob(pngBlob, `${fileBase}.png`);
        return;
      }

      const printWindow = window.open("", "_blank", "noopener,noreferrer");

      if (!printWindow) {
        throw new Error("Allow popups to export PDF.");
      }

      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>${fileBase}</title>
            <style>
              body {
                margin: 0;
                background: white;
                display: grid;
                place-items: center;
                min-height: 100vh;
              }
              svg {
                width: 100%;
                height: auto;
                max-width: 1200px;
              }
              @page {
                size: auto;
                margin: 12mm;
              }
            </style>
          </head>
          <body>${svgWithNamespace}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,111,46,0.16),_transparent_24%),linear-gradient(180deg,#151515_0%,#090909_100%)] px-3 py-3 text-white md:px-4 md:py-4 lg:px-5">
      <div className="mx-auto grid max-w-[1820px] gap-4 xl:grid-cols-[minmax(0,1.55fr)_420px] 2xl:grid-cols-[minmax(0,1.72fr)_460px]">
        <section className="panel flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[28px] p-3 md:p-4">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-2 pb-3 md:px-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">
                Generator
              </p>
              <h1 className="mt-2 text-3xl leading-none tracking-[-0.08em] md:text-[4rem]">
                Cutting Mat Composer
              </h1>
              <p className="mt-2 max-w-[48ch] text-sm leading-6 text-white/42">
                A tighter workbench layout inspired by the original app: live mat on the left, dense controls on the right.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/55">
              {exportSummary}
            </div>
          </div>

          <div className="mt-3 flex-1 rounded-[24px] bg-[#050505] p-1.5 md:p-2.5">
            <CuttingMatPreview
              width={width}
              height={height}
              surfaceColor={surfaceColor}
              guideColor={guideColor}
              showEdgeTicks={showEdgeTicks}
              showNumericGuides={showNumericGuides}
              showGrid={showGrid}
              gridOpacity={gridOpacity / 100}
              showRadiusGuides={showRadiusGuides}
              showTickMarks={showTickMarks}
              angleGuides={angleGuides}
              angularSpacing={angularSpacing}
              radii={radii}
              svgRef={svgRef}
              typography={typography}
            />
          </div>
        </section>

        <aside className="xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
          <div className="grid gap-4">
          <ControlCard title="Mat Size">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-2">
                <span className="label">Unit</span>
                <select
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                  className="field"
                >
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                  <option value="in">in</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="label">Width</span>
                <NumberField
                  value={width}
                  min={10}
                  max={120}
                  onChange={(value) => setWidth(clamp(value, 10, 120))}
                />
              </label>
              <label className="space-y-2">
                <span className="label">Height</span>
                <NumberField
                  value={height}
                  min={10}
                  max={120}
                  onChange={(value) => setHeight(clamp(value, 10, 120))}
                />
              </label>
            </div>
          </ControlCard>

          <ControlCard
            title="Surface"
            description="Control the mat's color, choose from a preset or create your own."
          >
            <div className="flex flex-wrap gap-2">
              {surfacePresets.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handlePresetChange(option)}
                  className={`preset-chip ${preset === option.id ? "preset-chip-active" : ""}`}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-white/20"
                    style={{ backgroundColor: option.surface }}
                  />
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="label">Surface Color</span>
                <input
                  id={surfaceColorId}
                  type="color"
                  value={surfaceColor}
                  onChange={(event) => {
                    setPreset("custom");
                    setSurfaceColor(event.target.value);
                  }}
                  className="color-swatch"
                />
              </label>
              <label className="space-y-2">
                <span className="label">Guide Color</span>
                <input
                  id={guideColorId}
                  type="color"
                  value={guideColor}
                  onChange={(event) => {
                    setPreset("custom");
                    setGuideColor(event.target.value);
                  }}
                  className="color-swatch"
                />
              </label>
            </div>

            <div className="mt-4 rounded-[20px] border border-white/10 bg-white/4 p-4">
              <div
                className="h-28 rounded-[16px] border border-white/10"
                style={{
                  background: `linear-gradient(180deg, #ffffff 0%, ${surfaceColor} 72%, #150500 100%)`,
                }}
              />
              <div className="mt-4 flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-full border border-white/15"
                  style={{ backgroundColor: surfaceColor }}
                />
                <div className="grid flex-1 grid-cols-3 gap-2">
                  {(["r", "g", "b"] as const).map((channel) => (
                    <div key={channel} className="rounded-2xl border border-white/10 bg-black/25 p-2">
                      <div className="text-center text-[0.68rem] uppercase tracking-[0.22em] text-white/40">
                        {channel}
                      </div>
                      <div className="mt-1 text-center text-base">
                        {surfaceRgb[channel]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <Range
                  min={0}
                  max={255}
                  value={surfaceRgb.r}
                  onChange={(value) =>
                    setSurfaceColor(rgbToHex(value, surfaceRgb.g, surfaceRgb.b))
                  }
                />
              </div>
            </div>
          </ControlCard>

          <ControlCard
            title="Guides"
            description="Configure alignment and measurement guides."
          >
            <div className="space-y-3.5">
              <div className="row">
                <span className="label">Edge Ticks</span>
                <Toggle checked={showEdgeTicks} onChange={setShowEdgeTicks} />
              </div>
              <div className="row">
                <span className="label">Numeric Guides</span>
                <Toggle
                  checked={showNumericGuides}
                  onChange={setShowNumericGuides}
                />
              </div>

              <div className="subpanel">
                <label className="space-y-2">
                  <span className="label">Typography</span>
                  <select
                    value={typography}
                    onChange={(event) => setTypography(event.target.value)}
                    className="field"
                  >
                    <option>Geist</option>
                    <option>IBM Plex Mono</option>
                    <option>Space Mono</option>
                  </select>
                </label>
              </div>

              <div className="row">
                <span className="label">Grid</span>
                <Toggle checked={showGrid} onChange={setShowGrid} />
              </div>

              <div className="subpanel">
                <div className="flex items-center gap-4">
                  <span className="label">Grid Opacity</span>
                  <Range
                    min={10}
                    max={100}
                    value={gridOpacity}
                    onChange={setGridOpacity}
                  />
                  <span className="w-10 text-right text-sm text-white/55">
                    {gridOpacity}%
                  </span>
                </div>
              </div>

              <div className="row">
                <span className="label">Radius Guides</span>
                <Toggle
                  checked={showRadiusGuides}
                  onChange={setShowRadiusGuides}
                />
              </div>

              <div className="subpanel space-y-3">
                {radii.map((radius, index) => (
                  <div key={`radius-field-${index}`} className="grid grid-cols-[52px_minmax(0,1fr)_40px] items-center gap-3">
                    <span className="label">R{index + 1}</span>
                    <NumberField
                      value={radius}
                      min={2}
                      max={Math.min(width, height)}
                      onChange={(value) =>
                        setRadii((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? clamp(value, 2, Math.min(width, height))
                              : entry,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      className="mini-button"
                      onClick={() =>
                        setRadii((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index ? Math.max(2, entry - 1) : entry,
                          ),
                        )
                      }
                    >
                      -
                    </button>
                  </div>
                ))}
              </div>

              <div className="row">
                <span className="label">Tick Marks</span>
                <Toggle checked={showTickMarks} onChange={setShowTickMarks} />
              </div>

              <div className="subpanel">
                <div className="flex items-center gap-4">
                  <span className="label">Angular Spacing</span>
                  <Range
                    min={5}
                    max={30}
                    step={5}
                    value={angularSpacing}
                    onChange={setAngularSpacing}
                  />
                  <span className="w-8 text-right text-sm text-white/55">
                    {angularSpacing}°
                  </span>
                </div>
              </div>

              <div className="row">
                <span className="label">Angle Guides</span>
                <Toggle checked={angleGuides} onChange={setAngleGuides} />
              </div>
            </div>
          </ControlCard>

          <div className="panel rounded-[22px] p-4">
            <div className="flex gap-2">
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value)}
                className="field max-w-[84px]"
              >
                <option>SVG</option>
                <option>PNG</option>
                <option>PDF</option>
              </select>
              <button
                type="button"
                className="download-button"
                onClick={() => void handleDownload()}
                disabled={isExporting}
              >
                {isExporting ? "Preparing..." : "Download"}
              </button>
              <button type="button" className="icon-button" aria-label="Duplicate export preset">
                ⧉
              </button>
            </div>
          </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
