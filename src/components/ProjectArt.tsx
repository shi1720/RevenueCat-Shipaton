import React from "react";
import { Image, View } from "react-native";
import Svg, { Path, Rect, Circle, Ellipse, G, Line } from "react-native-svg";
import type { Category } from "../domain/types";
export function ProjectArt({
  category,
  color = "#EDDCCE",
  uri,
  height = 170,
}: {
  category: Category;
  color?: string;
  uri?: string;
  height?: number;
}) {
  if (uri)
    return (
      <Image
        source={{ uri }}
        style={{ width: "100%", height }}
        resizeMode="cover"
        accessibilityLabel={`${category} project photo`}
      />
    );
  return (
    <View
      style={{
        backgroundColor: color,
        height,
        width: "100%",
        overflow: "hidden",
      }}
    >
      <Svg
        viewBox="0 0 360 200"
        width="100%"
        height="100%"
        accessibilityLabel={`${category} illustration`}
      >
        <Ellipse
          cx="181"
          cy="170"
          rx="89"
          ry="10"
          fill="#252638"
          opacity="0.07"
        />
        <Circle cx="286" cy="28" r="91" fill="#FFFFFF" opacity="0.16" />
        {category === "Sewing" ? (
          <G rotation="-8" origin="180,110">
            <Path
              d="M120 73 L238 73 L249 170 Q182 185 111 169 Z"
              fill="#C09C76"
            />
            <Path
              d="M126 79 L231 79 L239 165 Q185 173 119 164 Z"
              fill="#E4C8A3"
            />
            <Path
              d="M144 85 C133 2 222 4 211 84"
              fill="none"
              stroke="#A7825D"
              strokeWidth="13"
            />
            <Path
              d="M145 85 C136 9 219 9 211 84"
              fill="none"
              stroke="#E4C8A3"
              strokeWidth="7"
            />
            <Path d="M167 97 L198 98 L202 134 L163 132 Z" fill="#D4B289" />
            <Line
              x1="129"
              y1="85"
              x2="122"
              y2="160"
              stroke="#AE8B68"
              strokeDasharray="3 4"
            />
            <Line
              x1="226"
              y1="85"
              x2="235"
              y2="163"
              stroke="#AE8B68"
              strokeDasharray="3 4"
            />
            <Line
              x1="135"
              y1="74"
              x2="138"
              y2="100"
              stroke="#546F94"
              strokeWidth="2"
            />
            <Circle cx="134" cy="72" r="3" fill="#546F94" />
          </G>
        ) : category === "Woodwork" ? (
          <G>
            <Path d="M100 58 L245 42 L277 65 L131 82 Z" fill="#C89E72" />
            <Path d="M100 58 L131 82 L131 158 L100 136 Z" fill="#A97E55" />
            <Path d="M131 82 L277 65 L277 145 L131 158 Z" fill="#735442" />
            <Path d="M145 92 L260 80 L260 133 L145 145 Z" fill="#41413E" />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <Path
                key={i}
                d={`M${153 + i * 12} ${93 - i} l8 -1 l0 43 l-8 1 Z`}
                fill={["#DDD6BE", "#B8B6A1", "#8D795F", "#D7B797"][i % 4]}
              />
            ))}
            <Path d="M131 158 L277 145 L277 153 L131 168 Z" fill="#CCA678" />
            <Line
              x1="137"
              y1="65"
              x2="227"
              y2="56"
              stroke="#AC815C"
              strokeWidth="2"
            />
          </G>
        ) : category === "Art" ? (
          <G rotation="-7" origin="180,100">
            <Rect
              x="103"
              y="30"
              width="146"
              height="139"
              rx="4"
              fill="#FAF5E9"
            />
            <Rect x="115" y="42" width="122" height="99" fill="#DBE2E3" />
            <Path
              d="M115 104 L147 78 L168 88 L199 68 L237 104 L237 141 L115 141Z"
              fill="#A0AD9B"
            />
            <Path
              d="M135 108 L157 91 L176 108 L176 143 L135 143Z"
              fill="#D9B5A1"
            />
            <Path
              d="M179 101 L204 81 L225 101 L225 143 L179 143Z"
              fill="#C5A275"
            />
            <Path
              d="M129 110 L156 86 L181 110"
              fill="none"
              stroke="#805F5E"
              strokeWidth="5"
            />
            <Rect x="144" y="116" width="7" height="10" fill="#6F7379" />
            <Rect x="160" y="116" width="7" height="10" fill="#6F7379" />
            <Circle cx="132" cy="58" r="8" fill="#EED3A3" />
            <Line
              x1="261"
              y1="59"
              x2="271"
              y2="151"
              stroke="#A0764F"
              strokeWidth="5"
            />
            <Path d="M259 59 Q254 39 259 32 Q267 42 263 59" fill="#575269" />
          </G>
        ) : category === "Garden" ? (
          <G>
            <Path d="M143 118 L224 118 L211 171 L155 171Z" fill="#BA826B" />
            <Path d="M183 132 L182 53" stroke="#648363" strokeWidth="5" />
            <Ellipse
              cx="157"
              cy="75"
              rx="27"
              ry="13"
              rotation="32"
              origin="157,75"
              fill="#7F9C77"
            />
            <Ellipse
              cx="205"
              cy="59"
              rx="26"
              ry="12"
              rotation="-38"
              origin="205,59"
              fill="#648363"
            />
            <Ellipse
              cx="204"
              cy="101"
              rx="25"
              ry="12"
              rotation="-30"
              origin="204,101"
              fill="#91AA82"
            />
            <Rect
              x="138"
              y="115"
              width="89"
              height="13"
              rx="3"
              fill="#D6A088"
            />
          </G>
        ) : category === "Electronics" ? (
          <G>
            <Rect
              x="108"
              y="55"
              width="144"
              height="100"
              rx="10"
              fill="#507D72"
            />
            <Rect x="152" y="78" width="52" height="46" rx="4" fill="#323E46" />
            {[0, 1, 2, 3].map((i) => (
              <G key={i}>
                <Line
                  x1={158 + i * 13}
                  y1="68"
                  x2={158 + i * 13}
                  y2="78"
                  stroke="#D7CEB5"
                  strokeWidth="4"
                />
                <Line
                  x1={158 + i * 13}
                  y1="125"
                  x2={158 + i * 13}
                  y2="136"
                  stroke="#D7CEB5"
                  strokeWidth="4"
                />
              </G>
            ))}
            <Path
              d="M117 95 L133 95 L133 140 L226 140 L226 115 L245 115"
              fill="none"
              stroke="#9BBFAB"
              strokeWidth="3"
            />
            <Circle cx="126" cy="72" r="5" fill="#E9C188" />
          </G>
        ) : (
          <G>
            <Rect
              x="112"
              y="58"
              width="132"
              height="107"
              rx="6"
              fill="#BC9F78"
            />
            <Path d="M112 58 L177 32 L244 58 L177 85 Z" fill="#D7BE97" />
            <Line
              x1="177"
              y1="86"
              x2="177"
              y2="164"
              stroke="#957755"
              strokeWidth="2"
            />
            <Path
              d="M151 43 L217 70 L217 98 L200 104 L200 76 L134 49Z"
              fill="#F1DDB6"
            />
          </G>
        )}
        <G opacity="0.4">
          <Path
            d="M64 77 l0 12 M58 83 l12 0"
            stroke="#7C7268"
            strokeWidth="1.5"
          />
          <Circle cx="294" cy="136" r="3" fill="#9C897A" />
        </G>
      </Svg>
    </View>
  );
}
export function Mark({
  size = 34,
  light = false,
}: {
  size?: number;
  light?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect
        width="40"
        height="40"
        rx="13"
        fill={light ? "#FFFFFF20" : "#5753A3"}
      />
      <Rect x="11" y="11" width="5" height="18" rx="2.5" fill="#fff" />
      <Path
        d="M22 11 Q21 10 21 13 L21 27 Q21 30 24 28 L32 21 Q34 20 31 18 Z"
        fill="#fff"
      />
    </Svg>
  );
}
