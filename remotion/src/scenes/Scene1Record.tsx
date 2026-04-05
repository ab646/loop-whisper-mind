import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { colors, fonts } from "../MainVideo";

export const Scene1Record = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Step label
  const labelY = interpolate(frame, [0, 20], [40, 0], { extrapolateRight: "clamp" });
  const labelOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Orb animation
  const orbScale = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 100 } });
  const orbPulse = interpolate(frame, [30, 60, 90, 120], [1, 1.06, 1, 1.04], { extrapolateRight: "clamp" });

  // Mic icon fade
  const micOp = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" });

  // Title text
  const titleOp = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [25, 45], [30, 0], { extrapolateRight: "clamp" });

  // Subtitle
  const subOp = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [40, 60], [20, 0], { extrapolateRight: "clamp" });

  // Waveform bars appearing
  const waveOp = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" });

  // Subtle floating particles
  const p1Y = interpolate(frame, [0, 130], [900, 700]);
  const p2Y = interpolate(frame, [0, 130], [1100, 950]);
  const p3Y = interpolate(frame, [0, 130], [1300, 1150]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Floating accent dots */}
      {[
        { x: 180, y: p1Y, size: 6, op: 0.15 },
        { x: 820, y: p2Y, size: 4, op: 0.1 },
        { x: 500, y: p3Y, size: 8, op: 0.12 },
      ].map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: colors.mint,
            opacity: p.op,
          }}
        />
      ))}

      {/* Step label */}
      <div
        style={{
          position: "absolute",
          top: 500,
          opacity: labelOp,
          transform: `translateY(${labelY}px)`,
          fontSize: 28,
          fontFamily: fonts.body,
          fontWeight: 600,
          letterSpacing: "0.2em",
          color: colors.textDim,
          textTransform: "uppercase",
        }}
      >
        Step 1
      </div>

      {/* Orb */}
      <div
        style={{
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${colors.mint}, ${colors.mintDim})`,
          transform: `scale(${orbScale * orbPulse})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 80px rgba(166,206,206,0.2)`,
          marginTop: -40,
        }}
      >
        {/* Mic icon (SVG) */}
        <svg
          width="72"
          height="72"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.bg}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: micOp }}
        >
          <rect x="9" y="2" width="6" height="11" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      </div>

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 960,
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          fontSize: 64,
          fontFamily: fonts.display,
          fontStyle: "italic",
          color: colors.text,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        Record or type.
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: "absolute",
          top: 1060,
          opacity: subOp,
          transform: `translateY(${subY}px)`,
          fontSize: 34,
          fontFamily: fonts.display,
          fontStyle: "italic",
          color: colors.mint,
          textAlign: "center",
          lineHeight: 1.4,
          padding: "0 100px",
        }}
      >
        Voice note or text — just let it out.
      </div>

      {/* Waveform */}
      <div
        style={{
          position: "absolute",
          top: 1180,
          display: "flex",
          gap: 8,
          alignItems: "center",
          opacity: waveOp,
        }}
      >
        {Array.from({ length: 14 }).map((_, i) => {
          const h = interpolate(
            frame + i * 5,
            [50, 70, 90, 110, 130],
            [8, 28 + Math.sin(i * 1.2) * 16, 12, 24 + Math.cos(i * 0.8) * 14, 8],
            { extrapolateRight: "clamp" }
          );
          return (
            <div
              key={i}
              style={{
                width: 5,
                height: h,
                borderRadius: 3,
                background: colors.mintDim,
                opacity: 0.6,
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
