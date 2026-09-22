export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
