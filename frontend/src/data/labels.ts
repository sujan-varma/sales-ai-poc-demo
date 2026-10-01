// Text labels the components show (org counts, names, data date), derived from the backend data so no
// component hardcodes "7 regions", "Saurashtra" or "29th".

import { DATA_DAY, DAYS_LEFT, TERRITORIES, VIEWER } from "./cortexHome";
import { RANGE_DATA, REGIONS, TERRITORY_COUNT } from "./leadership";

const ord = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export const LBL = {
  asmName: VIEWER.asm.name,
  asmRegion: REGIONS.find((r) => r.asm === VIEWER.asm.name)?.name ?? REGIONS[0]?.name ?? "",
  asmTerrCount: TERRITORIES.length,
  asmTerritories: `${TERRITORIES.length} ${TERRITORIES.length === 1 ? "territory" : "territories"}`,
  regions: plural(REGIONS.length, "region"),
  asms: plural(REGIONS.length, "ASM"),
  territories: `${TERRITORY_COUNT} territories`,
  state: VIEWER.head.scope.split(" · ")[0],
  daysLeft: plural(DAYS_LEFT, "day") + " left",
  dataDay: DATA_DAY,
  dataDayTh: ord(DATA_DAY),
  dataDate: `${DATA_DAY} Sep`,
  monthActions: Math.max(1, RANGE_DATA.month.actions.total),
};
