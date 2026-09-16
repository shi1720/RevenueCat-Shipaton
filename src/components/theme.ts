import { Platform, StyleSheet } from "react-native";
export const c = {
  bg: "#F8F7F3",
  paper: "#FFFFFF",
  ink: "#252638",
  muted: "#686773",
  line: "#E7E5E0",
  purple: "#5753A3",
  purpleDark: "#343150",
  lilac: "#EEEAF8",
  green: "#4F715C",
  greenLight: "#E9F0E8",
  coral: "#DC8F76",
};
// Web keeps readable system fallbacks when a font request fails. Native font
// families must remain single registered names, so only web receives CSS stacks.
const family = (name: string, serif = false) =>
  Platform.OS === "web"
    ? `"${name}", ${serif ? "Georgia, serif" : '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'}`
    : name;
export const font = {
  regular: family("DMSans_400Regular"),
  medium: family("DMSans_500Medium"),
  bold: family("DMSans_700Bold"),
  serif: family("Fraunces_500Medium", true),
  serifItalic: family("Fraunces_500Medium_Italic", true),
};

export const common = StyleSheet.create({
  body: {
    fontFamily: font.regular,
    color: c.ink,
    fontSize: 15,
    lineHeight: 23,
  },
  muted: {
    fontFamily: font.regular,
    color: c.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  label: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 1.8,
    color: c.muted,
    textTransform: "uppercase",
  },
  title: { fontFamily: font.serif, fontSize: 36, lineHeight: 43, color: c.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  card: {
    backgroundColor: c.paper,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.line,
    padding: 22,
  },
});
