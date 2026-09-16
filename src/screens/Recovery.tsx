import React, { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "../components/ui";
import { c, common } from "../components/theme";
import { useApp } from "../store";
import {
  importBackup,
  discardImportedPhotos,
  clearUnusedPhotos,
} from "../services/media";
import type { AppData } from "../domain/types";
export function Recovery({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  const { update, snapshot } = useApp();
  const [candidate, setCandidate] = useState<AppData | null>(null);
  const [issue, setIssue] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setIssue("");
    try {
      await fn();
    } catch (e) {
      setIssue(
        e instanceof Error ? e.message : "Could not restore your backup.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: c.bg,
        padding: 25,
      }}
    >
      <View style={{ width: "100%", maxWidth: 500, gap: 22 }}>
        <Text style={common.title}>Your projects need a moment.</Text>
        <Text style={common.body}>{error}</Text>
        {candidate ? (
          <>
            <Text style={common.body}>
              This backup contains {candidate.projects.length} projects.
              Restoring it will replace the unreadable data on this device. Keep
              your original backup file.
            </Text>
            <Button
              title="Restore this backup"
              busy={busy}
              onPress={() =>
                run(async () => {
                  await update(() => candidate);
                  await clearUnusedPhotos(snapshot().projects).catch((e) =>
                    setIssue(e.message),
                  );
                  retry();
                })
              }
            />
            <Button
              title="Keep the current data"
              kind="secondary"
              disabled={busy}
              onPress={() =>
                run(async () => {
                  await discardImportedPhotos(candidate, snapshot().projects);
                  setCandidate(null);
                })
              }
            />
          </>
        ) : (
          <>
            <Button title="Try reading again" onPress={retry} />
            <Button
              title="Choose a backup to restore"
              kind="secondary"
              busy={busy}
              onPress={() =>
                run(async () => setCandidate(await importBackup()))
              }
            />
          </>
        )}
        {!!issue && (
          <Text accessibilityRole="alert" style={{ color: "#A64343" }}>
            {issue}
          </Text>
        )}
      </View>
    </View>
  );
}
