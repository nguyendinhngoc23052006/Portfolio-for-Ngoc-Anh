// Language-independent facts. Each one lives here once; vi.ts and en.ts hold
// only the words around them.
export const profile = {
  name: "Nguyễn Ngọc Anh",
  email: "ngocanh20192@gmail.com",
  phone: "+84 399 655 339",
  ielts: { score: 7, max: 9 },
  tools: [
    "Microsoft Excel",
    "Microsoft PowerPoint",
    "Microsoft Word",
    "Adobe Photoshop",
    "Adobe Illustrator",
  ],
  journey: [
    { id: "design", start: "2022", end: null, stats: ["5+", "100–300+"] },
    { id: "silk", start: "2024", end: null, stats: [] },
    { id: "dongAm", start: "2025", end: "03/2026", stats: [] },
    { id: "vmo", start: "05/2026", end: "08/2026", stats: [] },
  ],
  education: [
    { id: "ftu", start: "2024", end: null },
    { id: "hnams", start: "2021", end: "2024" },
  ],
} as const;

export type JourneyId = (typeof profile.journey)[number]["id"];
export type EducationId = (typeof profile.education)[number]["id"];

export function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function formatPeriod(start: string, end: string | null, present: string): string {
  return `${start} — ${end ?? present}`;
}
