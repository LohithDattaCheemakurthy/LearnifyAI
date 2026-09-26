import {
  Target,
  Globe,
  Cog,
  RefreshCw,
  BarChart3,
  Bot,
  ShieldCheck,
  Zap,
  Smartphone,
  Palette,
  Briefcase,
  LucideIcon,
} from "lucide-react";

export interface CareerPathDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const CANONICAL_CAREER_PATHS: CareerPathDefinition[] = [
  {
    id: "all",
    label: "All Paths",
    icon: Target,
    description: "Explore all career tracks and masteries",
  },
  {
    id: "frontend",
    label: "Frontend Developer",
    icon: Globe,
    description: "HTML, CSS, JavaScript, Responsive UI & Web Apps",
  },
  {
    id: "backend",
    label: "Backend Developer",
    icon: Cog,
    description: "Python, Java, Node.js, Databases & APIs",
  },
  {
    id: "fullstack",
    label: "Full Stack",
    icon: RefreshCw,
    description: "End-to-end web engineering from UI to servers",
  },
  {
    id: "data-science",
    label: "Data Scientist & Analytics",
    icon: BarChart3,
    description: "Power BI, Excel, Analytics & Python data modeling",
  },
  {
    id: "ai-ml",
    label: "AI/ML & Prompt Engineer",
    icon: Bot,
    description: "ChatGPT, Claude, Generative AI & Python AI workflows",
  },
  {
    id: "productivity",
    label: "Office & Productivity",
    icon: Briefcase,
    description: "Excel, Word, PowerPoint, Google Workspace & Automation",
  },
  {
    id: "design",
    label: "UI/UX Designer",
    icon: Palette,
    description: "Figma design systems, wireframing & prototype mastery",
  },
  {
    id: "devops",
    label: "Developer Tools & Git",
    icon: Zap,
    description: "VS Code, Git version control, workflows & tooling",
  },
];

/**
 * Maps a course to all career paths it fulfills.
 * Resolves taxonomy disconnects so filters and counts remain 100% synchronized with live course records.
 */
export function getCourseCareerPaths(course: {
  slug?: string;
  title?: string;
  category?: string;
  tags?: string[];
}): string[] {
  const normSlug = (course.slug || "").toLowerCase();
  const normTitle = (course.title || "").toLowerCase();
  const normCat = (course.category || "").toLowerCase();
  const paths = new Set<string>();

  // Frontend
  if (
    normCat === "web dev" ||
    normCat === "design" ||
    normSlug.includes("html") ||
    normSlug.includes("css") ||
    normSlug.includes("javascript") ||
    normSlug.includes("figma") ||
    normSlug.includes("template")
  ) {
    paths.add("frontend");
  }

  // Backend
  if (
    normCat === "programming" ||
    normSlug.includes("python") ||
    normSlug.includes("java") ||
    normSlug.includes("javascript")
  ) {
    paths.add("backend");
  }

  // Full Stack
  if (
    normCat === "web dev" ||
    normSlug.includes("html") ||
    normSlug.includes("javascript") ||
    normSlug.includes("python") ||
    normSlug.includes("template") ||
    normSlug.includes("vs-code")
  ) {
    paths.add("fullstack");
  }

  // Data Science & Analytics
  if (
    normCat.includes("data") ||
    normSlug.includes("power-bi") ||
    normSlug.includes("excel") ||
    normSlug.includes("python")
  ) {
    paths.add("data-science");
  }

  // AI & Prompt Engineering
  if (
    normCat.includes("ai") ||
    normSlug.includes("chatgpt") ||
    normSlug.includes("claude") ||
    normSlug.includes("python")
  ) {
    paths.add("ai-ml");
  }

  // Productivity
  if (
    normCat.includes("productivity") ||
    normSlug.includes("excel") ||
    normSlug.includes("word") ||
    normSlug.includes("powerpoint") ||
    normSlug.includes("workspace") ||
    normSlug.includes("chatgpt") ||
    normSlug.includes("power-bi")
  ) {
    paths.add("productivity");
  }

  // UI/UX Design
  if (normCat.includes("design") || normSlug.includes("figma") || normSlug.includes("css")) {
    paths.add("design");
  }

  // DevOps & Tools
  if (
    normCat.includes("developer tools") ||
    normSlug.includes("vs-code") ||
    normSlug.includes("git")
  ) {
    paths.add("devops");
  }

  return Array.from(paths);
}

/**
 * Calculates accurate published course counts for every career path.
 */
export function getCareerPathCounts(courses: Array<any>): Record<string, number> {
  const counts: Record<string, number> = {
    all: courses.length,
  };

  CANONICAL_CAREER_PATHS.forEach((p) => {
    if (p.id !== "all") counts[p.id] = 0;
  });

  courses.forEach((c) => {
    const paths = getCourseCareerPaths(c);
    paths.forEach((pId) => {
      counts[pId] = (counts[pId] || 0) + 1;
    });
  });

  return counts;
}
