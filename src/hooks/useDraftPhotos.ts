import { useEffect, useRef } from "react";
import type { Project } from "../domain/types";
import { discardUnusedPhoto } from "../services/media";
/** A picker creates durable files before save; cancel must not leak them. */
export function useDraftPhotos(
  projects: Project[],
  report: (message: string) => void,
) {
  const state = useRef({
    live: true,
    uris: new Set<string>(),
    keep: undefined as string | undefined,
    projects,
    report,
  });
  state.current.projects = projects;
  state.current.report = report;
  useEffect(() => {
    const value = state.current;
    return () => {
      value.live = false;
      for (const uri of value.uris)
        if (uri !== value.keep)
          void discardUnusedPhoto(uri, value.projects).catch((e) =>
            value.report(e.message),
          );
    };
  }, []);
  return {
    track(uri: string) {
      const value = state.current;
      if (!value.live) {
        void discardUnusedPhoto(uri, value.projects).catch((e) =>
          value.report(e.message),
        );
        return;
      }
      value.uris.add(uri);
    },
    keep(uri: string | undefined) {
      state.current.keep = uri;
    },
  };
}
