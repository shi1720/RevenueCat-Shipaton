import { useEffect } from "react";

export interface FormSafety {
  dirty: boolean;
  busy: boolean;
}
export type ReportFormSafety = (state: FormSafety) => void;

/** Modal owners guard closing; forms keep their own validation and durable save. */
export function useFormSafety(
  dirty: boolean,
  busy: boolean,
  report?: ReportFormSafety,
) {
  useEffect(() => {
    report?.({ dirty, busy });
  }, [dirty, busy, report]);
  useEffect(
    () => () => {
      report?.({ dirty: false, busy: false });
    },
    [report],
  );
}
