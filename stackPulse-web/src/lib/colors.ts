const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Java: "#b07219",
  Go: "#00add8",
  Rust: "#dea584",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4f5d95",
  Swift: "#f05138",
  Kotlin: "#a97bff",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#663399",
  Vue: "#41b883",
  Dart: "#00b4ab",
  Lua: "#000080",
  Scala: "#c22d40",
}

const FALLBACK_PALETTE = [
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#0ea5e9",
  "#84cc16",
]

function hash(value: string) {
  let h = 0
  for (const char of value) h = (h * 31 + char.charCodeAt(0)) >>> 0
  return h
}

export function languageColor(language: string) {
  return (
    LANGUAGE_COLORS[language] ??
    FALLBACK_PALETTE[hash(language) % FALLBACK_PALETTE.length]!
  )
}

// One colour per compared developer, assigned by position so columns match across charts.
export const DEVELOPER_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#14b8a6",
  "#ec4899",
  "#0ea5e9",
]
