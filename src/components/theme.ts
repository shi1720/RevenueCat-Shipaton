import { StyleSheet } from "react-native";
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
export const font = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  bold: "DMSans_700Bold",
  serif: "Fraunces_500Medium",
  serifItalic: "Fraunces_500Medium_Italic",
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
