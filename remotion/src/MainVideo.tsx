import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Scene1Record } from "./scenes/Scene1Record";
import { Scene2Reflect } from "./scenes/Scene2Reflect";
import { Scene3Patterns } from "./scenes/Scene3Patterns";
import { loadFont } from "@remotion/google-fonts/Manrope";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerif";

const { fontFamily: bodyFont } = loadFont("normal", { weights: ["400", "600", "700"], subsets: ["latin"] });
const { fontFamily: displayFont } = loadSerif("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

export const fonts = { body: bodyFont, display: displayFont };

// Colors matching the app's Noetic Fog theme
export const colors = {
  bg: "#0a1414",
  bgLight: "#111d1d",
  surface: "#162222",
  mint: "#a6cece",
  mintDim: "#3d6666",
  text: "#e0e8e8",
  textDim: "#7a9494",
};

export const MainVideo = () => {
  const frame = useCurrentFrame();

  // Subtle background gradient drift
  const gradX = interpolate(frame, [0, 360], [20, 80]);
  const gradY = interpolate(frame, [0, 360], [50, 30]);

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(ellipse at ${gradX}% ${gradY}%, rgba(166,206,206,0.06) 0%, transparent 60%),
          radial-gradient(ellipse at ${100 - gradX}% ${100 - gradY}%, rgba(61,102,102,0.08) 0%, transparent 50%),
          ${colors.bg}
        `,
        fontFamily: fonts.body,
      }}
    >
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={130}>
          <Scene1Record />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={130}>
          <Scene2Reflect />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={140}>
          <Scene3Patterns />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
