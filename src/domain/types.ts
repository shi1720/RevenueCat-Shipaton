export type Category =
  "Sewing" | "Woodwork" | "Art" | "Electronics" | "Garden" | "Other";
export type ProjectStatus = "paused" | "active" | "finished";
export type Energy = "gentle" | "steady" | "focused";
export interface Checkpoint {
  id: string;
  createdAt: string;
  stoppedAt: string;
  nextStep: string;
  materials: string;
  blocker: string;
  minutes: number;
  photoUri?: string;
}
export interface Project {
  id: string;
  title: string;
  category: Category;
  description: string;
  color: string;
  status: ProjectStatus;
  energy: Energy;
  nextMinutes: number;
  createdAt: string;
  updatedAt: string;
  checkpoints: Checkpoint[];
  totalMinutes: number;
  sessionCount: number;
  coverUri?: string;
  reminderId?: string;
  reminderAt?: string;
  isSample?: boolean;
}
export interface ActiveSession {
  projectId: string;
  startedAt: string;
  targetMinutes: number;
}
export interface AppData {
  version: 1;
  projects: Project[];
  activeSession: ActiveSession | null;
  hasOnboarded: boolean;
  displayName: string;
}
export type ProjectDraft = Pick<
  Project,
  "title" | "category" | "description" | "energy" | "nextMinutes"
> & { nextStep: string; materials: string; coverUri?: string };
