import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  ArrowDownRight,
  ArrowRight,
  Clock3,
  Coffee,
  Leaf,
  Plus,
  Sparkles,
} from "lucide-react-native";
import { c, common, font } from "../components/theme";
import { Button, Chip, Empty } from "../components/ui";
import { ProjectArt } from "../components/ProjectArt";
import { useApp } from "../store";
import { daysSince, suggestProjects } from "../domain/projects";
import type { Energy, Project } from "../domain/types";
export function ProjectCard({
  project: p,
  onPress,
  width,
}: {
  project: Project;
  onPress: () => void;
  width?: number | `${number}%`;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${p.title}`}
      onPress={onPress}
      style={({ pressed }) => [
        s.projectCard,
        { width: width || "100%", opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <ProjectArt
        category={p.category}
        color={p.color}
        uri={p.coverUri}
        height={168}
      />
      <View style={{ padding: 18, gap: 11 }}>
        <View style={[common.row, { justifyContent: "space-between" }]}>
          <Text style={[common.label, { color: c.purple, fontSize: 9 }]}>
            {p.category}
          </Text>
          <Text style={[common.muted, { fontSize: 10 }]}>
            {p.status === "finished"
              ? "FINISHED"
              : `${daysSince(p.updatedAt)}d ago`}
          </Text>
        </View>
        <Text
          style={{ fontFamily: font.serif, fontSize: 22, color: c.ink }}
          numberOfLines={1}
        >
          {p.title}
        </Text>
        <Text
          style={[
            common.muted,
            { fontSize: 12, lineHeight: 18, minHeight: 36 },
          ]}
          numberOfLines={2}
        >
          {p.checkpoints[0].nextStep}
        </Text>
        <View
          style={[
            common.row,
            {
              borderTopWidth: 1,
              borderTopColor: c.line,
              paddingTop: 13,
              justifyContent: "space-between",
            },
          ]}
        >
          <View style={[common.row, { gap: 5 }]}>
            <Clock3 size={12} color={c.muted} />
            <Text style={[common.muted, { fontSize: 11 }]}>
              {p.nextMinutes} min next step
            </Text>
          </View>
          <ArrowRight size={17} color={c.purple} />
        </View>
      </View>
    </Pressable>
  );
}
export function Home({
  open,
  create,
  shelf,
}: {
  open: (id: string) => void;
  create: () => void;
  shelf: () => void;
}) {
  const { data } = useApp();
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const [minutes, setMinutes] = useState(25);
  const [energy, setEnergy] = useState<Energy | undefined>();
  const suggestions = suggestProjects(data.projects, minutes, energy);
  const project = suggestions[0];
  const openProjects = data.projects.filter((p) => p.status !== "finished");
  const sessions = data.projects.reduce((n, p) => n + p.sessionCount, 0);
  return (
    <View style={{ gap: compact ? 25 : 32 }}>
      <View style={[common.row, { justifyContent: "space-between" }]}>
        <View style={{ gap: 7, flex: 1, minWidth: 0 }}>
          <Text style={common.label}>YOUR LITTLE CREATIVE CORNER</Text>
          <Text
            accessibilityRole="header"
            style={[
              common.title,
              { fontSize: compact ? 33 : 41, lineHeight: compact ? 40 : 49 },
            ]}
          >
            Good to have you back
            {data.displayName ? `, ${data.displayName.split(" ")[0]}` : ""}.
          </Text>
          <Text style={common.muted}>
            Your projects are right where you left them.
          </Text>
        </View>
        {!compact && (
          <View style={s.dayNote}>
            <Leaf size={20} color={c.green} />
            <Text style={[common.muted, { fontSize: 11 }]}>
              A little is enough.
            </Text>
          </View>
        )}
      </View>
      <View style={[s.hero, compact && { padding: 22, minHeight: 250 }]}>
        <View style={{ flex: 1, zIndex: 1, gap: 16 }}>
          <View style={common.row}>
            <View style={s.heroDot} />
            <Text style={[common.label, { color: "#D1CCE9", fontSize: 9 }]}>
              MAKE ROOM FOR MAKING
            </Text>
          </View>
          <Text
            style={[
              s.heroTitle,
              { fontSize: compact ? 34 : 47, lineHeight: compact ? 39 : 53 },
            ]}
          >
            A little time.{"\n"}A little progress.
          </Text>
          <Text
            style={{
              fontFamily: font.regular,
              color: "#D4D0E4",
              fontSize: 13,
              lineHeight: 21,
              maxWidth: 290,
            }}
          >
            You don’t have to finish today.{"\n"}Just find your way back in.
          </Text>
          <View style={{ alignSelf: "flex-start", marginTop: 4 }}>
            <Button
              title={
                data.activeSession
                  ? "Return to your session"
                  : project
                    ? `Pick up ${project.title.toLowerCase()}`
                    : "Start something small"
              }
              onPress={() =>
                data.activeSession
                  ? open(data.activeSession.projectId)
                  : project
                    ? open(project.id)
                    : create()
              }
              icon={ArrowRight}
              style={{
                backgroundColor: "#F2EDDB",
                maxWidth: compact ? 290 : 360,
              }}
              kind="secondary"
            />
          </View>
        </View>
        {!compact && (
          <View style={s.heroArt}>
            <ProjectArt category="Sewing" color="#716997" height={245} />
            <View style={s.paperNote}>
              <Text
                style={{
                  fontFamily: font.serifItalic,
                  fontSize: 18,
                  color: c.ink,
                }}
              >
                Dear future me,
              </Text>
              <Text style={[common.muted, { fontSize: 11, lineHeight: 17 }]}>
                The next step is already{"\n"}waiting for you.
              </Text>
              <ArrowDownRight size={25} color={c.purple} />
            </View>
          </View>
        )}
      </View>
      <View style={{ gap: 15 }}>
        <View
          style={[
            common.row,
            { justifyContent: "space-between", flexWrap: "wrap" },
          ]}
        >
          <View style={common.row}>
            <Coffee size={19} color={c.purple} />
            <Text
              style={{ fontFamily: font.medium, fontSize: 16, color: c.ink }}
            >
              How much time is yours?
            </Text>
          </View>
          <Text style={[common.muted, { fontSize: 11 }]}>
            Start small. Stay curious.
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 9 }}
        >
          {[10, 25, 45, 90].map((m) => (
            <Chip
              key={m}
              label={m === 90 ? "A little longer" : `${m} minutes`}
              selected={m === minutes}
              onPress={() => setMinutes(m)}
              icon={Clock3}
            />
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <Chip
            label="Any energy"
            selected={!energy}
            onPress={() => setEnergy(undefined)}
            icon={Leaf}
          />
          {(["gentle", "steady", "focused"] as Energy[]).map((value) => (
            <Chip
              key={value}
              label={`${value[0].toUpperCase() + value.slice(1)} energy`}
              selected={energy === value}
              onPress={() => setEnergy(value)}
            />
          ))}
        </ScrollView>
        <View style={s.fitNote}>
          <Sparkles size={15} color={c.purple} />
          <Text
            style={[common.muted, { color: c.purple, flex: 1, fontSize: 12 }]}
          >
            {suggestions.length
              ? `${suggestions.length} ${suggestions.length === 1 ? "project has a next step" : "projects have next steps"} that fit your ${minutes === 90 ? "free time" : `${minutes} minutes`}.`
              : "No next steps match this time and energy yet. Try a wider window, or make a step smaller."}
          </Text>
        </View>
      </View>
      <View style={{ gap: 18 }}>
        <View style={[common.row, { justifyContent: "space-between" }]}>
          <Text style={{ fontFamily: font.serif, fontSize: 26, color: c.ink }}>
            Ready when you are{" "}
            <Text
              style={{ color: c.muted, fontFamily: font.regular, fontSize: 14 }}
            >
              {" "}
              / {suggestions.length}
            </Text>
          </Text>
          <Pressable
            onPress={shelf}
            accessibilityRole="button"
            accessibilityLabel="View all projects"
          >
            <Text
              style={{ color: c.purple, fontSize: 12, fontFamily: font.bold }}
            >
              View all →
            </Text>
          </Pressable>
        </View>
        {!openProjects.length ? (
          <Empty
            title="Something good starts here."
            text="A half-made thing, a small idea, a project worth returning to. Give it a home."
          >
            <Button
              title="Add your first project"
              onPress={create}
              icon={Plus}
            />
          </Empty>
        ) : !suggestions.length ? (
          <Empty
            title="There’s no rush."
            text="Choose a longer window above, or open your shelf to break a next step into something smaller."
          >
            <Button
              title="Open project shelf"
              onPress={shelf}
              kind="secondary"
            />
          </Empty>
        ) : (
          <View
            style={{
              flexDirection: compact ? "column" : "row",
              gap: 17,
              flexWrap: "wrap",
            }}
          >
            {suggestions.slice(0, 3).map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onPress={() => open(p.id)}
                width={compact ? "100%" : "31.8%"}
              />
            ))}
          </View>
        )}
      </View>
      <View style={s.bottomNote}>
        <View style={[s.smallIcon, { backgroundColor: c.greenLight }]}>
          <Leaf size={19} color={c.green} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: font.medium, fontSize: 13, color: c.ink }}>
            {sessions
              ? `${sessions} little returns. They all count.`
              : "Made for real life. Interruptions included."}
          </Text>
          <Text style={[common.muted, { fontSize: 12 }]}>
            {data.projects.some((p) => p.isSample)
              ? "You’re exploring a sample studio. Make it yours whenever you’re ready."
              : "No streak to keep. No falling behind. Just you, making things."}
          </Text>
        </View>
      </View>
    </View>
  );
}
export function Shelf({
  open,
  create,
}: {
  open: (id: string) => void;
  create: () => void;
}) {
  const { data } = useApp();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState("Open");
  const [query, setQuery] = useState("");
  const projects = data.projects.filter(
    (p) =>
      (filter === "Finished"
        ? p.status === "finished"
        : p.status !== "finished") &&
      `${p.title} ${p.category} ${p.checkpoints[0].materials}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <View style={{ gap: 25 }}>
      <View
        style={[
          common.row,
          { justifyContent: "space-between", flexWrap: "wrap" },
        ]}
      >
        <View>
          <Text style={common.label}>EVERY IDEA HAS A PLACE</Text>
          <Text style={[common.title, { marginTop: 9 }]}>
            Your project shelf.
          </Text>
        </View>
        <Button title="New project" onPress={create} icon={Plus} />
      </View>
      <Text style={common.muted}>
        A home for the things you’re making, and the things you’ve made.
      </Text>
      <TextInput
        accessibilityLabel="Search projects"
        placeholder="Find a project, craft, or material…"
        value={query}
        onChangeText={setQuery}
        style={{
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 13,
          padding: 15,
          fontFamily: font.regular,
          color: c.ink,
        }}
      />
      <View style={common.row}>
        {["Open", "Finished"].map((f) => (
          <Chip
            key={f}
            label={f}
            selected={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </View>
      {!projects.length ? (
        <Empty
          title={
            query
              ? "Nothing here by that name."
              : filter === "Finished"
                ? "Good things take their own time."
                : "Your shelf is ready."
          }
          text={
            query
              ? "Try a different word, or look in the other shelf."
              : filter === "Finished"
                ? "Finished projects will live here, with every small step that got them there."
                : "Save a project and give future you a place to begin."
          }
        />
      ) : (
        <View
          style={{
            flexDirection: width < 700 ? "column" : "row",
            flexWrap: "wrap",
            gap: 18,
          }}
        >
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onPress={() => open(p.id)}
              width={width < 700 ? "100%" : "31.8%"}
            />
          ))}
        </View>
      )}
    </View>
  );
}
export function Moments({ open }: { open: (id: string) => void }) {
  const { data } = useApp();
  const entries = data.projects
    .flatMap((p) =>
      p.checkpoints
        .filter((cp) => !cp.id.endsWith("-first"))
        .map((cp) => ({ p, cp })),
    )
    .sort((a, b) => b.cp.createdAt.localeCompare(a.cp.createdAt));
  return (
    <View style={{ gap: 23 }}>
      <Text style={common.label}>PROGRESS, WITHOUT THE PRESSURE</Text>
      <Text style={common.title}>Little moments. Real making.</Text>
      <Text style={common.muted}>
        Your notes to future you, collected along the way.
      </Text>
      {!entries.length ? (
        <Empty
          title="The first return is a lovely start."
          text="After a making session, leave a checkpoint. Each one becomes a little record of your progress."
        />
      ) : (
        entries.map(({ p, cp }) => (
          <Pressable
            key={`${p.id}-${cp.id}`}
            accessibilityRole="button"
            accessibilityLabel={`View checkpoint for ${p.title}`}
            onPress={() => open(p.id)}
            style={[common.card, { gap: 13 }]}
          >
            <View style={[common.row, { justifyContent: "space-between" }]}>
              <Text style={[common.label, { color: c.purple }]}>{p.title}</Text>
              <Text style={common.muted}>
                {new Date(cp.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
            <Text
              style={{ fontFamily: font.serif, fontSize: 23, color: c.ink }}
            >
              {cp.stoppedAt || "A small step forward."}
            </Text>
            <Text style={common.muted}>Next time: {cp.nextStep}</Text>
            <Text style={[common.muted, { fontSize: 11 }]}>
              {cp.minutes} minutes of making
            </Text>
          </Pressable>
        ))
      )}
    </View>
  );
}
const s = StyleSheet.create({
  dayNote: { alignItems: "center", gap: 7, paddingHorizontal: 10 },
  hero: {
    backgroundColor: c.purpleDark,
    borderRadius: 25,
    padding: 34,
    flexDirection: "row",
    overflow: "hidden",
    minHeight: 300,
  },
  heroTitle: { fontFamily: font.serif, color: "#fff" },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#C3CCA2" },
  heroArt: {
    width: 280,
    justifyContent: "center",
    marginRight: -22,
    borderRadius: 150,
    overflow: "hidden",
    opacity: 0.95,
  },
  paperNote: {
    backgroundColor: "#FAF6E8",
    position: "absolute",
    bottom: 12,
    right: 7,
    padding: 16,
    gap: 7,
    transform: [{ rotate: "7deg" }],
    borderRadius: 3,
    width: 176,
  },
  fitNote: { flexDirection: "row", gap: 9, alignItems: "center" },
  projectCard: {
    borderRadius: 18,
    backgroundColor: "#fff",
    borderColor: c.line,
    borderWidth: 1,
    overflow: "hidden",
  },
  bottomNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 7,
    paddingBottom: 5,
  },
  smallIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
