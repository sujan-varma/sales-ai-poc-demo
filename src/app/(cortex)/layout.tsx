import { IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif } from "next/font/google";
import { NextCortexNav } from "./NextCortexNav";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });
// display serif, reserved for editorial moments (DESIGN.md)
const serif = Instrument_Serif({ subsets: ["latin"], weight: ["400"], variable: "--font-serif" });

export default function CortexHomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${sans.variable} ${mono.variable} ${serif.variable} cx-root min-h-screen bg-cx-bg font-plex text-cx-text antialiased`} style={{ colorScheme: "dark" }}>
      <NextCortexNav>{children}</NextCortexNav>
    </div>
  );
}
