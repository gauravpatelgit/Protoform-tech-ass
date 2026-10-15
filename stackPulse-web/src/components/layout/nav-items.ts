import {
  BookmarkIcon,
  GitCompareArrowsIcon,
  SearchIcon,
  SaveIcon,
} from "lucide-react"

export const NAV_ITEMS = [
  { to: "/", label: "Search", icon: SearchIcon, end: true },
  { to: "/compare", label: "Compare", icon: GitCompareArrowsIcon, end: false },
  { to: "/pins", label: "Pins", icon: BookmarkIcon, end: false },
  { to: "/comparisons", label: "Saved", icon: SaveIcon, end: false },
] as const
