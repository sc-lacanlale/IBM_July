export type DiscoverCategory = "all" | "phrases" | "greetings" | "alphabet" | "daily";

export interface DiscoverCard {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  category: Exclude<DiscoverCategory, "all">;
  favorite?: boolean;
  mediaUrl: string;
  posterUrl?: string;
}

export interface DiscoverRepository {
  list(category?: DiscoverCategory, query?: string): Promise<DiscoverCard[]>;
  toggleFavorite(id: string): Promise<void>;
}

const AUTHOR = "Nathaniel Escuro";

function reel(file: string) {
  return `/assets/hearing/discover/${file}`;
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const MOCK: DiscoverCard[] = [
  {
    id: "good-morning",
    title: titleFromSlug("good-morning"),
    subtitle: "FSL Sign",
    author: AUTHOR,
    category: "greetings",
    mediaUrl: reel("good-morning.mp4"),
  },
  {
    id: "yes",
    title: titleFromSlug("yes"),
    subtitle: "FSL Sign",
    author: AUTHOR,
    category: "phrases",
    mediaUrl: reel("yes.mp4"),
  },
  {
    id: "nice-to-meet-you",
    title: titleFromSlug("nice-to-meet-you"),
    subtitle: "FSL Sign",
    author: AUTHOR,
    category: "greetings",
    mediaUrl: reel("nice-to-meet-you.mp4"),
  },
  {
    id: "deaf-person",
    title: titleFromSlug("deaf-person"),
    subtitle: "FSL Sign",
    author: AUTHOR,
    category: "phrases",
    mediaUrl: reel("deaf-person.mp4"),
  },
];

/** Local mock repo — swap for API later without changing UI. */
export function createMockDiscoverRepository(): DiscoverRepository {
  let items = [...MOCK];

  return {
    async list(category = "all", query = "") {
      const q = query.trim().toLowerCase();
      return items.filter((item) => {
        const catOk = category === "all" || item.category === category;
        const qOk =
          !q ||
          item.title.toLowerCase().includes(q) ||
          item.author.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q);
        return catOk && qOk;
      });
    },
    async toggleFavorite(id: string) {
      items = items.map((i) =>
        i.id === id ? { ...i, favorite: !i.favorite } : i,
      );
    },
  };
}
