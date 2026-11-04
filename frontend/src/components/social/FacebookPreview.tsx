import { Globe2, MessageCircle, Share2, ThumbsUp } from "lucide-react";
import { BrandCard } from "./BrandCard";

export interface PreviewPost {
  platform: string;
  theme: string;
  headline: string;
  caption: string;
  hashtags: string;
  publishedAt?: string | Date | null;
}

const tags = (h: string) => h.split(" ").filter(Boolean).map((t) => `#${t}`).join(" ");

export function FacebookPreview({ post }: { post: PreviewPost }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm">
      <div className="flex items-center gap-2 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white">Q</div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Q&apos;s Wellness Clinic</div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            {post.publishedAt ? "Just now" : "Preview"} · <Globe2 className="h-3 w-3" />
          </div>
        </div>
      </div>
      <p className="whitespace-pre-line px-3 pb-2 text-sm">
        {post.caption} <span className="text-blue-600">{tags(post.hashtags)}</span>
      </p>
      <BrandCard headline={post.headline} theme={post.theme} platform="facebook" />
      <div className="flex justify-around border-t border-slate-200 py-2 text-xs font-medium text-slate-500">
        <span className="flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> Like</span>
        <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> Comment</span>
        <span className="flex items-center gap-1"><Share2 className="h-4 w-4" /> Share</span>
      </div>
    </div>
  );
}
