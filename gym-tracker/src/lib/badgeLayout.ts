// Badge layout system — types + per-section production configs
// After running the editor, paste the JSON output into the relevant layout constant.

export type BadgePosition = { x: number; y: number }; // percentage 0–100

export type SectionLayout = {
  backgroundImage: string;      // e.g. "/badge-backgrounds/milestones.jpg"
  imageAspectRatio: number;     // width / height of the background image
  badgeSizePercent: number;     // badge size as % of card width (e.g. 14 = 14%)
  positions: Record<string, BadgePosition>; // badgeKey → position
};

export type EditorBadge = {
  key: string;
  imgSrc: string;
  label: string;
};

// ─── Per-section badge lists for the editor ───────────────────────────────────

export const MILESTONES_EDITOR_BADGES: EditorBadge[] = [
  { key: "1",   imgSrc: "/milestones/1.png",   label: "1" },
  { key: "10",  imgSrc: "/milestones/10.png",  label: "10" },
  { key: "20",  imgSrc: "/milestones/20.png",  label: "20" },
  { key: "30",  imgSrc: "/milestones/30.png",  label: "30" },
  { key: "50",  imgSrc: "/milestones/50.png",  label: "50" },
  { key: "60",  imgSrc: "/milestones/60.png",  label: "60" },
  { key: "75",  imgSrc: "/milestones/75.png",  label: "75" },
  { key: "100", imgSrc: "/milestones/100.png", label: "100" },
];

export const VOLUME_EDITOR_BADGES: EditorBadge[] = [
  { key: "50t",    imgSrc: "/volume/50t.png",    label: "50T" },
  { key: "100t",   imgSrc: "/volume/100t.png",   label: "100T" },
  { key: "150t",   imgSrc: "/volume/150t.png",   label: "150T" },
  { key: "250t",   imgSrc: "/volume/250t.png",   label: "250T" },
  { key: "500t",   imgSrc: "/volume/500t.png",   label: "500T" },
  { key: "750t",   imgSrc: "/volume/750t.png",   label: "750T" },
  { key: "1000t",  imgSrc: "/volume/1000t.png",  label: "1000T" },
  { key: "1500t",  imgSrc: "/volume/1500t.png",  label: "1500T" },
  { key: "2000t",  imgSrc: "/volume/2000t.png",  label: "2000T" },
  { key: "2500t",  imgSrc: "/volume/2500t.png",  label: "2500T" },
  { key: "3000t",  imgSrc: "/volume/3000t.png",  label: "3000T" },
  { key: "4000t",  imgSrc: "/volume/4000t.png",  label: "4000T" },
  { key: "5000t",  imgSrc: "/volume/5000t.png",  label: "5000T" },
];

export const SOCIAL_EDITOR_BADGES: EditorBadge[] = [
  { key: "1friend",     imgSrc: "/social/1friend.png",     label: "1 Friend" },
  { key: "5friends",    imgSrc: "/social/5friends.png",    label: "5 Friends" },
  { key: "10friends",   imgSrc: "/social/10friends.png",   label: "10 Friends" },
  { key: "1fistbump",   imgSrc: "/social/1fistbump.png",   label: "1 Fist Bump" },
  { key: "10fistbumps", imgSrc: "/social/10fistbumps.png", label: "10 Fist Bumps" },
  { key: "30fistbumps", imgSrc: "/social/30fistbumps.png", label: "30 Fist Bumps" },
];

export const SPECIALS_EDITOR_BADGES: EditorBadge[] = [
  { key: "early-adopter", imgSrc: "/stardusticon.png", label: "Early Adopter" },
  { key: "architect",     imgSrc: "/stardusticon.png", label: "The Architect" },
];

// ─── Production layout configs ────────────────────────────────────────────────
// Run the editor (pencil icon on each card, admin only), position your badges,
// click "Copy JSON", then paste the output below as the value for each section.

export const MILESTONES_LAYOUT: SectionLayout | null = {
  "backgroundImage": "/badge-backgrounds/milestones.png",
  "imageAspectRatio": 1.4984,
  "badgeSizePercent": 13,
  "positions": {
    "1":   { "x": 51.5, "y": 92 },
    "10":  { "x": 68.6, "y": 69.3 },
    "20":  { "x": 32.4, "y": 79.8 },
    "30":  { "x": 59.8, "y": 44.1 },
    "50":  { "x": 51.5, "y": 56.4 },
    "60":  { "x": 44.4, "y": 36.3 },
    "75":  { "x": 54.4, "y": 23.5 },
    "100": { "x": 50.1, "y": 7.5 }
  }
};
export const VOLUME_LAYOUT: SectionLayout | null = null;
export const SOCIAL_LAYOUT: SectionLayout | null = null;
export const SPECIALS_LAYOUT: SectionLayout | null = null;
