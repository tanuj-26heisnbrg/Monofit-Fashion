export const PRODUCT_COLORS = [
  "Black", "White", "Navy", "Navy Blue", "Blue", "Sky Blue", "Cyan",
  "Red", "Maroon", "Burgundy", "Pink", "Light Pink", "Coral", "Orange",
  "Yellow", "Green", "Dark Green", "Mint", "Teal", "Olive", "Purple",
  "Violet", "Lavender", "Magenta", "Brown", "Tan", "Beige", "Cream",
  "Off White", "Gray", "Grey", "Charcoal", "Rust", "Multicolor",
];

const swatchColors = {
  black: "#171717", white: "#ffffff", navy: "#172554", navyblue: "#172554",
  blue: "#2563eb", skyblue: "#38bdf8", cyan: "#06b6d4", red: "#dc2626",
  maroon: "#7f1d1d", burgundy: "#701c3b", pink: "#ec4899", lightpink: "#f9a8d4",
  coral: "#f87171", orange: "#ea580c", yellow: "#eab308", green: "#15803d",
  darkgreen: "#14532d", mint: "#6ee7b7", teal: "#0f766e", olive: "#737a28",
  purple: "#9333ea", violet: "#7c3aed", lavender: "#a78bfa", magenta: "#c026d3",
  brown: "#78350f", tan: "#c2a47f", beige: "#d6c6a5", cream: "#f5f0df",
  offwhite: "#f5f5f0", gray: "#9ca3af", grey: "#9ca3af", charcoal: "#374151",
  rust: "#b45309", multicolor: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
};

export function getSwatchColor(value) {
  const key = String(value).toLowerCase().replace(/[\s_-]/g, "");
  if (/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)) return value;
  if (typeof CSS !== "undefined" && CSS.supports("color", value)) return value;
  return swatchColors[key] || "#a3a3a3";
}
