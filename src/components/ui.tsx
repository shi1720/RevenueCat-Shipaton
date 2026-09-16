import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { c, common, font } from "./theme";

export function HistoryPager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <View style={{ gap: 10 }}>
      <Text accessibilityLiveRegion="polite" style={common.muted}>
        Notes page {page + 1} of {pages}
      </Text>
      <View style={[common.row, { flexWrap: "wrap" }]}>
        <Button
          title="Newer notes"
          kind="secondary"
          disabled={page === 0}
          onPress={() => onPage(page - 1)}
        />
        <Button
          title="Older notes"
          kind="secondary"
          disabled={page >= pages - 1}
          onPress={() => onPage(page + 1)}
        />
      </View>
    </View>
  );
}

export function Button({
  title,
  onPress,
  icon: Icon,
  kind = "primary",
  disabled,
  busy,
  style,
  testID,
}: {
  title: string;
  onPress: () => void;
  icon?: LucideIcon;
  kind?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  busy?: boolean;
  style?: ViewStyle;
  testID?: string;
}) {
  const color =
    kind === "primary" ? "#fff" : kind === "danger" ? "#A64343" : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        disabled: Boolean(disabled || busy),
        busy: Boolean(busy),
      }}
      testID={testID}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        kind === "primary"
          ? s.primary
          : kind === "secondary"
            ? s.secondary
            : {},
        style,
        { opacity: disabled || busy ? 0.5 : pressed ? 0.75 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : Icon ? (
        <Icon size={17} color={color} />
      ) : null}
      <Text style={[s.buttonText, { color }]}>{title}</Text>
    </Pressable>
  );
}
export function Field({
  label,
  hint,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...props}
        style={[
          s.input,
          props.multiline && { minHeight: 95, textAlignVertical: "top" },
          props.style,
        ]}
      />
      {hint && <Text style={common.muted}>{hint}</Text>}
    </View>
  );
}
export function Chip({
  label,
  selected,
  onPress,
  icon: Icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: LucideIcon;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        s.chip,
        selected && s.chipOn,
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {Icon && <Icon size={14} color={selected ? "#fff" : c.muted} />}
      <Text style={[s.chipText, selected && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}
export function Empty({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <View
      style={[
        common.card,
        { paddingVertical: 42, alignItems: "center", gap: 12 },
      ]}
    >
      <Text style={[common.title, { fontSize: 26, textAlign: "center" }]}>
        {title}
      </Text>
      <Text style={[common.muted, { textAlign: "center", maxWidth: 340 }]}>
        {text}
      </Text>
      {children}
    </View>
  );
}
const s = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 19,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: c.purple },
  secondary: { backgroundColor: c.paper, borderWidth: 1, borderColor: c.line },
  buttonText: {
    fontFamily: font.bold,
    fontSize: 13,
    flexShrink: 1,
    textAlign: "center",
  },
  fieldLabel: { fontFamily: font.medium, color: c.ink, fontSize: 13 },
  input: {
    backgroundColor: "#F9F8F5",
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 12,
    padding: 14,
    fontFamily: font.regular,
    fontSize: 15,
    color: c.ink,
    minHeight: 50,
  },
  chip: {
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  chipOn: { backgroundColor: c.ink, borderColor: c.ink },
  chipText: { fontFamily: font.medium, fontSize: 12, color: c.muted },
});
