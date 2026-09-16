import { createProject } from "./projects";
import type { AppData, Project } from "./types";
export function sampleData(): AppData {
  const ago = (days: number) =>
    new Date(Date.now() - days * 86400000).toISOString();
  const make = (
    id: string,
    days: number,
    values: Parameters<typeof createProject>[0],
    stoppedAt: string,
    sessions: number,
    minutes: number,
  ): Project => {
    const p = createProject(values, id, ago(days));
    return {
      ...p,
      isSample: true,
      sessionCount: sessions,
      totalMinutes: minutes,
      checkpoints: [{ ...p.checkpoints[0], stoppedAt }],
    };
  };
  return {
    version: 1,
    hasOnboarded: true,
    displayName: "",
    activeSession: null,
    projects: [
      make(
        "sample-tote",
        3,
        {
          title: "The Sunday tote",
          category: "Sewing",
          description: "A little room for everything.",
          energy: "gentle",
          nextMinutes: 10,
          nextStep:
            "Pin the two straps 10 cm from each side seam. The blue pins mark the front.",
          materials:
            "Linen + straps in the canvas basket, beside the sewing machine.",
        },
        "Body is sewn. Straps are pressed, but not attached. Use a 2.5 mm stitch length.",
        3,
        85,
      ),
      make(
        "sample-shelf",
        8,
        {
          title: "A home for the records",
          category: "Woodwork",
          description: "An oak shelf for the good stuff.",
          energy: "focused",
          nextMinutes: 45,
          nextStep: "Sand the top panel with 180 grit, following the grain.",
          materials:
            "Panels against the garage wall. Sandpaper in the red toolbox.",
        },
        "All four panels are cut. Pencil triangles show the inside faces. Test fit worked.",
        2,
        120,
      ),
      make(
        "sample-art",
        1,
        {
          title: "Postcards from nowhere",
          category: "Art",
          description: "Small places, entirely imagined.",
          energy: "steady",
          nextMinutes: 25,
          nextStep:
            "Mix a warm grey and paint the three tiny windows on the left house.",
          materials:
            "Sketchbook on the desk. Palette is covered with the white ceramic plate.",
        },
        "First wash is dry. Keep the right side of the street light. The sky is finished.",
        4,
        95,
      ),
    ],
  };
}
