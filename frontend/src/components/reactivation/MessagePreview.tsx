export interface Preview {
  id: string;
  name: string;
  message: string;
}

export function MessagePreview({ previews }: { previews: Preview[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {previews.map((p) => (
        <div key={p.id} className="slide-in rounded-2xl border border-sage-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold text-brand-900">To: {p.name}</div>
          <div className="rounded-2xl rounded-tl-sm bg-sage-100 px-3 py-2 text-sm text-slate-800">{p.message}</div>
          <div className="mt-1 text-right text-[10px] text-slate-400">{p.message.length} characters</div>
        </div>
      ))}
    </div>
  );
}
