import { Bookmark, Heart, MessageCircle, Send } from "lucide-react";
import { BrandCard } from "./BrandCard";
import type { PreviewPost } from "./FacebookPreview";

export function InstagramPreview({ post }: { post: PreviewPost }) {
  const tags = post.hashtags.split(" ").filter(Boolean).map((t) => `#${t}`).join(" ");
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm">
      <div className="flex items-center gap-2 p-3">
        <div className="rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[2px]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-xs font-bold text-white">Q</div>
        </div>
        <div className="text-sm font-semibold">qwellnessclinic</div>
      </div>
      <BrandCard headline={post.headline} theme={post.theme} platform="instagram" />
      <div className="flex items-center gap-3 px-3 pt-2.5">
        <Heart className="h-5 w-5" />
        <MessageCircle className="h-5 w-5" />
        <Send className="h-5 w-5" />
        <Bookmark className="ml-auto h-5 w-5" />
      </div>
      <p className="whitespace-pre-line px-3 pb-3 pt-1.5 text-sm">
        <span className="font-semibold">qwellnessclinic </span>
        {post.caption} <span className="text-blue-700">{tags}</span>
      </p>
    </div>
  );
}
