"use client";

import { useState } from "react";
import { Check, ExternalLink, Pencil, RefreshCw, Rocket, X } from "lucide-react";
import { Facebook, Instagram } from "@/components/ui/brand-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { fmt } from "@/lib/scheduling";
import { BrandCard } from "./BrandCard";
import { FacebookPreview } from "./FacebookPreview";
import { InstagramPreview } from "./InstagramPreview";

export interface PostRow {
  id: string;
  platform: string;
  theme: string;
  headline: string;
  caption: string;
  hashtags: string;
  imagePrompt: string;
  cta: string;
  suggestedAt: string;
  status: string;
  publishedAt: string | null;
  externalUrl: string | null;
}

export function PostCard({
  post,
  busy,
  onApprove,
  onReject,
  onRegenerate,
  onPublish,
  onSave,
}: {
  post: PostRow;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  onPublish: () => void;
  onSave: (caption: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.caption);
  const [preview, setPreview] = useState(false);
  const Icon = post.platform === "facebook" ? Facebook : Instagram;
  const tags = post.hashtags.split(" ").filter(Boolean).map((t) => `#${t}`).join(" ");

  return (
    <Card className="slide-in overflow-hidden">
      <div className="grid sm:grid-cols-[200px_1fr]">
        <div className="bg-sage-50 p-3">
          <BrandCard headline={post.headline} theme={post.theme} platform={post.platform} className="rounded-xl !aspect-square" />
        </div>
        <div className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="sage"><Icon className="h-3 w-3" /> {post.platform}</Badge>
            <Badge>{post.theme}</Badge>
            <Badge variant={post.status === "published" ? "solid" : post.status === "approved" ? "default" : "amber"}>{post.status}</Badge>
            <span className="ml-auto text-xs text-slate-500">{fmt(post.suggestedAt, "EEE MMM d · h:mm a")}</span>
          </div>
          {editing ? (
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[120px]" />
          ) : (
            <p className="whitespace-pre-line text-sm text-slate-800">{post.caption}</p>
          )}
          <p className="text-xs text-brand-700">{tags}</p>
          {post.imagePrompt && <p className="text-[11px] italic text-slate-400">Image idea: {post.imagePrompt}</p>}

          <div className="mt-1 flex flex-wrap gap-2">
            {post.status === "draft" && (
              <>
                <Button size="sm" onClick={onApprove} disabled={busy}><Check className="h-3.5 w-3.5" /> Approve</Button>
                {editing ? (
                  <Button size="sm" variant="soft" onClick={() => { onSave(draft); setEditing(false); }}>Save edit</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                )}
                <Button size="sm" variant="outline" onClick={onRegenerate} disabled={busy}><RefreshCw className="h-3.5 w-3.5" /> Regenerate</Button>
                <Button size="sm" variant="ghost" onClick={onReject} disabled={busy}><X className="h-3.5 w-3.5" /> Reject</Button>
              </>
            )}
            {post.status === "approved" && (
              <Button size="sm" onClick={onPublish} disabled={busy}><Rocket className="h-3.5 w-3.5" /> Publish now</Button>
            )}
            {post.status === "published" && post.externalUrl && (
              <span className="flex items-center gap-1 text-xs text-slate-500"><ExternalLink className="h-3 w-3" /> {post.externalUrl}</span>
            )}
            <Button size="sm" variant="ghost" onClick={() => setPreview(!preview)}>{preview ? "Hide" : "Show"} {post.platform} preview</Button>
          </div>
        </div>
      </div>
      {preview && (
        <div className="border-t border-sage-200 bg-sage-50 p-4">
          <div className="mx-auto max-w-sm">
            {post.platform === "facebook" ? <FacebookPreview post={post} /> : <InstagramPreview post={post} />}
          </div>
        </div>
      )}
    </Card>
  );
}
