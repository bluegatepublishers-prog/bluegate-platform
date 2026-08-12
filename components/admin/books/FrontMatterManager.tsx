"use client";

import { useState, useTransition } from "react";
import type { BookFrontMatterType } from "@prisma/client";
import {
  createBookFrontMatterItem,
  editBookFrontMatterItem,
  removeBookFrontMatterItem,
  reorderBookFrontMatterItems,
} from "@/app/admin/books/[id]/structure/mapping-actions";

type Item = { id: string; title: string; type: BookFrontMatterType; displayOrder: number; startPage: number | null; endPage: number | null };

const types: Array<[BookFrontMatterType, string]> = [
  ["TITLE_PAGE", "Title Page"], ["PUBLISHER_PAGE", "Publisher Page"], ["COPYRIGHT", "Copyright"],
  ["PREFACE", "Preface"], ["FOREWORD", "Foreword"], ["INTRODUCTION", "Introduction"], ["OTHER", "Other"],
];

export default function FrontMatterManager({ bookId, items }: { bookId: string; items: Item[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<BookFrontMatterType>("OTHER");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const ordered = [...items].sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id));

  function run(task: () => Promise<unknown>) {
    startTransition(async () => {
      try { await task(); setMessage("Saved."); setEditing(null); setTitle(""); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save front matter."); }
    });
  }

  return <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">Front Matter</p><p className="text-xs text-slate-500">Ordered book pages before the parts hierarchy.</p></div><button type="button" onClick={() => { setEditing("new"); setTitle(""); setType("OTHER"); }} className="rounded-lg bg-slate-950 px-2 py-1 text-xs font-semibold text-white">+ Add Front Matter</button></div>
    {editing === "new" ? <Editor title={title} setTitle={setTitle} type={type} setType={setType} pending={pending} onCancel={() => setEditing(null)} onSave={() => run(() => createBookFrontMatterItem(bookId, { title, type, startPage: null, endPage: null }))} /> : null}
    {ordered.map((item, index) => editing === item.id ? <Editor key={item.id} title={title} setTitle={setTitle} type={type} setType={setType} pending={pending} onCancel={() => setEditing(null)} onSave={() => run(() => editBookFrontMatterItem(bookId, item.id, { title, type, startPage: item.startPage, endPage: item.endPage }))} /> : <div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-100 p-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{item.title}</p><p className="text-xs text-slate-500">{types.find(([value]) => value === item.type)?.[1]} · {item.startPage != null && item.endPage != null ? `Pages ${item.startPage}–${item.endPage}` : "Unmapped"}</p></div><button type="button" disabled={index === 0 || pending} onClick={() => run(() => reorderBookFrontMatterItems(bookId, move(ordered, index, index - 1).map((entry) => entry.id)))} className="rounded border px-2 py-1 text-xs">↑</button><button type="button" disabled={index === ordered.length - 1 || pending} onClick={() => run(() => reorderBookFrontMatterItems(bookId, move(ordered, index, index + 1).map((entry) => entry.id)))} className="rounded border px-2 py-1 text-xs">↓</button><button type="button" onClick={() => { setEditing(item.id); setTitle(item.title); setType(item.type); }} className="rounded border px-2 py-1 text-xs">Edit</button><button type="button" disabled={pending} onClick={() => run(() => removeBookFrontMatterItem(bookId, item.id))} className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700">Delete</button></div>)}
    <p aria-live="polite" className="min-h-4 text-xs text-slate-600">{message}</p>
  </div>;
}

function Editor({ title, setTitle, type, setType, pending, onCancel, onSave }: { title: string; setTitle: (value: string) => void; type: BookFrontMatterType; setType: (value: BookFrontMatterType) => void; pending: boolean; onCancel: () => void; onSave: () => void }) {
  return <div className="grid gap-2 rounded-xl border border-blue-100 bg-blue-50 p-2 sm:grid-cols-[1fr_12rem_auto_auto]"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" className="rounded border px-2 py-1 text-xs" /><select value={type} onChange={(event) => setType(event.target.value as BookFrontMatterType)} className="rounded border px-2 py-1 text-xs">{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" disabled={pending} onClick={onSave} className="rounded bg-slate-950 px-2 py-1 text-xs font-semibold text-white">Save</button><button type="button" onClick={onCancel} className="rounded border px-2 py-1 text-xs">Cancel</button></div>;
}

function move<T>(items: T[], from: number, to: number) { const next = [...items]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; }
