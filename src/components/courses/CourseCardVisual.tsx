import React from "react";
import { CourseBrandLogo, type KnownBrand } from "./CourseBrandLogo";
import { SafeImage } from "@/components/ui/SafeImage";
import { getCleanBannerUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { GraduationCap } from "lucide-react";

interface CourseCardVisualProps {
  course: {
    slug?: string;
    title?: string;
    cover_url?: string | null;
    category?: string;
  };
  className?: string;
  aspectRatio?: "video" | "square";
}

/**
 * Maps course slug/title to canonical brand logos.
 */
export function getCourseBrands(slug: string = "", title: string = ""): KnownBrand[] {
  const norm = `${slug} ${title}`.toLowerCase();
  const brands: KnownBrand[] = [];

  if (norm.includes("word") && norm.includes("powerpoint")) {
    return ["microsoft-word", "microsoft-powerpoint"];
  }
  if (norm.includes("chatgpt") || norm.includes("claude")) {
    return ["chatgpt", "claude"];
  }
  if (norm.includes("vs-code") || norm.includes("vscode") || (norm.includes("code") && norm.includes("git"))) {
    return ["vs-code", "git"];
  }
  if (norm.includes("html") || norm.includes("css")) {
    return ["html5", "css3"];
  }
  if (norm.includes("power-bi") || norm.includes("powerbi")) {
    return ["microsoft-power-bi"];
  }
  if (norm.includes("excel") || norm.includes("sheets")) {
    return ["microsoft-excel"];
  }
  if (norm.includes("python")) {
    return ["python"];
  }
  if (norm.includes("java") && !norm.includes("javascript")) {
    return ["java"];
  }
  if (norm.includes("javascript") || norm.includes("js")) {
    return ["javascript"];
  }
  if (norm.includes("figma")) {
    return ["figma"];
  }
  if (norm.includes("google") || norm.includes("workspace")) {
    return ["google-workspace"];
  }
  if (norm.includes("react")) {
    return ["react"];
  }

  return brands;
}

export function CourseCardVisual({
  course,
  className,
  aspectRatio = "video",
}: CourseCardVisualProps) {
  const brands = getCourseBrands(course.slug, course.title);
  const cleanCover = course.cover_url ? getCleanBannerUrl(course.cover_url) : null;
  const isSvgPath = cleanCover?.endsWith(".svg") || cleanCover?.startsWith("/course-covers");

  // If a valid raster cover exists (and is not a placeholder svg path), render it with brand overlay
  const hasValidCustomCover = Boolean(cleanCover && !isSvgPath);

  // Gradient themes matching brand colors
  const primaryBrand = brands[0];
  let gradientClass = "from-slate-900 via-indigo-950/70 to-slate-900";
  let accentBorder = "border-primary/20";

  if (primaryBrand?.includes("excel")) {
    gradientClass = "from-[#082817] via-[#0E4728] to-[#061C10]";
    accentBorder = "border-emerald-500/30";
  } else if (primaryBrand?.includes("word")) {
    gradientClass = "from-[#081E3D] via-[#103A70] to-[#05152B]";
    accentBorder = "border-blue-500/30";
  } else if (primaryBrand?.includes("powerpoint")) {
    gradientClass = "from-[#331108] via-[#5C1D0C] to-[#240A04]";
    accentBorder = "border-rose-500/30";
  } else if (primaryBrand?.includes("power-bi")) {
    gradientClass = "from-[#2A230B] via-[#4D3F12] to-[#1C1706]";
    accentBorder = "border-amber-500/30";
  } else if (primaryBrand?.includes("python")) {
    gradientClass = "from-[#0B1E2E] via-[#15344F] to-[#091825]";
    accentBorder = "border-sky-500/30";
  } else if (primaryBrand?.includes("figma")) {
    gradientClass = "from-[#1F1329] via-[#352245] to-[#140B1B]";
    accentBorder = "border-purple-500/30";
  } else if (primaryBrand?.includes("chatgpt")) {
    gradientClass = "from-[#06261E] via-[#0D4033] to-[#041A14]";
    accentBorder = "border-emerald-500/30";
  } else if (primaryBrand?.includes("html") || primaryBrand?.includes("git")) {
    gradientClass = "from-[#2B1109] via-[#4F2011] to-[#1C0A04]";
    accentBorder = "border-orange-500/30";
  }

  return (
    <div
      className={cn(
        "w-full overflow-hidden relative border-b border-border/50 flex items-center justify-center select-none",
        aspectRatio === "video" ? "aspect-video" : "aspect-square",
        className,
      )}
    >
      {hasValidCustomCover ? (
        <>
          <SafeImage
            src={cleanCover!}
            alt={course.title || "Course Cover"}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {brands.length > 0 && (
            <div className="absolute top-2.5 left-2.5 p-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 shadow-lg flex items-center gap-1.5">
              {brands.map((b) => (
                <CourseBrandLogo key={b} brand={b} size={20} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div
          className={cn(
            "w-full h-full bg-gradient-to-br transition-all duration-500 flex flex-col items-center justify-center p-6 relative",
            gradientClass,
          )}
        >
          {/* Subtle micro-grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

          {/* Glow backdrop */}
          <div className="absolute w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none" />

          {brands.length > 0 ? (
            <div className="relative z-10 flex items-center gap-3">
              {brands.map((b, i) => (
                <div
                  key={b}
                  className={cn(
                    "p-3 rounded-2xl bg-card/85 backdrop-blur-md shadow-2xl border transition-transform duration-300 group-hover:scale-110",
                    accentBorder,
                    i > 0 && "-ml-2",
                  )}
                >
                  <CourseBrandLogo brand={b} size={42} />
                </div>
              ))}
            </div>
          ) : (
            <div className="relative z-10 p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
              <GraduationCap className="h-10 w-10" />
            </div>
          )}

          {/* Clean brand label footer */}
          <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-[10px] font-semibold text-white/60 tracking-wider uppercase">
            <span>Learnify AI</span>
            <span>{course.category || "Course"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
