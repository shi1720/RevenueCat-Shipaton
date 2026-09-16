import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { blankData } from "./domain/projects";
import type { AppData } from "./domain/types";
import { loadData, saveData } from "./services/storage";
interface Store {
  data: AppData;
  snapshot: () => AppData;
  loading: boolean;
  loadError: string | null;
  reload: () => void;
  update: (fn: (current: AppData) => AppData) => Promise<void>;
}
const Context = createContext<Store | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(blankData);
  const current = useRef(data);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const reload = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    loadData()
      .then((value) => {
        current.current = value;
        setData(value);
      })
      .catch((error) =>
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not read your projects.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  useEffect(reload, [reload]);
  const update = useCallback((fn: (current: AppData) => AppData) => {
    const next = writes.current.then(async () => {
      const value = fn(current.current);
      await saveData(value);
      current.current = value;
      setData(value);
    });
    writes.current = next.catch(() => {});
    return next;
  }, []);
  return (
    <Context.Provider
      value={{
        data,
        snapshot: () => current.current,
        loading,
        loadError,
        reload,
        update,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing AppProvider");
  return value;
}
