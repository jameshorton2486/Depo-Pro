import {
  Check,
  FileAudio,
  FileText,
  Headphones,
  LockKeyhole,
  Menu,
  Mic2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import type { SiteRoute } from "./routes";

const navigation = [
  ["How it works", "/features"],
  ["Pricing", "/pricing"],
  ["Help", "/help"],
] as const;

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="border-b border-slate-800 bg-slate-950/95 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <a href="/" className="text-xl font-semibold tracking-tight text-sky-300">Depo-Pro</a>
        <nav className="hidden items-center gap-8 md:flex">
          {navigation.map(([label, href]) => <a key={href} href={href} className="text-sm text-slate-300 hover:text-white">{label}</a>)}
          <a href="/app" className="text-sm font-medium text-white">Sign in</a>
          <a href="/checkout" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500">Plans and checkout</a>
        </nav>
        <button type="button" aria-label="Toggle navigation" className="md:hidden" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && <nav className="grid gap-1 border-t border-slate-800 px-5 py-4 md:hidden">
        {navigation.map(([label, href]) => <a key={href} href={href} className="py-2 text-slate-200">{label}</a>)}
        <a href="/app" className="py-2 text-white">Sign in to workspace</a>
        <a href="/checkout" className="mt-2 rounded-md bg-blue-600 px-4 py-3 text-center font-semibold">Plans and checkout</a>
      </nav>}
    </header>
  );
}

function Footer() {
  return <footer className="border-t border-slate-800 bg-slate-950 text-slate-400">
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <p>Depo-Pro provides working transcript drafts, not certified final transcripts.</p>
      <div className="flex gap-5"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/help">Help</a></div>
    </div>
  </footer>;
}

function TranscriptSample() {
  const lines = [
    ["10:14:08", "SPEAKER 1", "Q.", "Please state your full name for the record."],
    ["10:14:12", "SPEAKER 2", "A.", "My name is Jordan Taylor."],
    ["10:14:18", "SPEAKER 1", "Q.", "Were you present at the meeting on March 12th?"],
    ["10:14:23", "SPEAKER 2", "A.", "Yes. I arrived shortly before nine in the morning and remained until the meeting ended."],
  ];
  return <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl shadow-slate-950/30">
    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs text-slate-600"><span><b className="mr-2 text-emerald-600">●</b>Depo-Pro Live connected</span><span>00:18:42</span></div>
    <div className="divide-y divide-slate-100 px-5 sm:px-8">
      {lines.map(([time, speaker, mark, text]) => <div key={time} className="grid gap-3 py-6 sm:grid-cols-[100px_1fr]">
        <div className="font-mono text-[11px] font-semibold text-slate-500">{time}<br />{speaker}</div>
        <p className="font-serif text-sm leading-7 text-slate-900"><b className="mr-2">{mark}</b>{text}</p>
      </div>)}
    </div>
    <p className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">Illustrative Windows-app sample. Audio-based diarization determines speaker turns before text correction.</p>
  </div>;
}

function Home() {
  return <>
    <section className="bg-slate-950 text-white"><div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-28">
      <div><p className="mb-5 text-sm font-semibold uppercase tracking-[.2em] text-sky-300">A connected deposition workflow</p><h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">Follow the testimony. Finish the record.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">Use Depo-Pro Live on Windows to create a readable live draft, then use the web workspace to organize, review, format, and export the transcript.</p><div className="mt-9 flex flex-wrap gap-3"><a href="/app" className="rounded-md bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500">Open the web workspace</a><a href="/features" className="rounded-md border border-slate-600 px-6 py-3 font-semibold hover:border-slate-400">See how it works</a></div></div>
      <TranscriptSample />
    </div></section>
    <section className="bg-white py-20"><div className="mx-auto max-w-7xl px-5 lg:px-8"><p className="text-sm font-semibold uppercase tracking-[.18em] text-blue-700">One connected workflow</p><h2 className="mt-3 max-w-3xl text-3xl font-semibold text-slate-950 sm:text-4xl">From captured audio to review-ready transcript</h2><div className="mt-10 grid gap-5 md:grid-cols-3">
      {[[Mic2,"Capture the proceeding","Record the reporter’s microphone and system audio. Zoom is supported, but not required."],[Users,"Follow speaker turns","Audio-based diarization separates speakers before punctuation and paragraph cleanup."],[FileText,"Review and finish","Open the transcript workspace to edit, format, certify, and export the record."]].map(([Icon,title,text]) => <article key={String(title)} className="border-t-2 border-blue-600 bg-slate-50 p-7"><Icon className="text-blue-700"/><h3 className="mt-5 text-lg font-semibold text-slate-950">{String(title)}</h3><p className="mt-3 leading-7 text-slate-600">{String(text)}</p></article>)}
    </div></div></section>
  </>;
}

function Features() {
  const features = [[Headphones,"Live audio capture","Capture microphone and computer audio while keeping a local recording."],[Users,"Speaker separation","Use the audio—not dialogue guesses—to determine speaker changes."],[FileText,"Readable paragraphs","Add punctuation and paragraph boundaries while testimony continues."],[FileAudio,"Recording review","Reopen saved audio and transcripts independently of subscription status."],[ShieldCheck,"Professional workflow","Move from intake through review, certification, and export in one workspace."],[LockKeyhole,"Controlled access","Keep provider credentials on the server and authorize cloud transcription per account."]];
  return <Page title="A clearer record, built for deposition work" intro="Depo-Pro Live and the Depo-Pro web workspace serve different parts of one workflow: capture the proceeding on Windows, follow the live draft, then review and deliver it on the web."><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{features.map(([Icon,title,text]) => <article key={String(title)} className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm"><Icon className="text-blue-700"/><h2 className="mt-5 text-lg font-semibold text-slate-950">{String(title)}</h2><p className="mt-3 leading-7 text-slate-600">{String(text)}</p></article>)}</div></Page>;
}

function Pricing({ checkout = false }: { checkout?: boolean }) {
  return <Page title={checkout ? "Choose your plan" : "Simple monthly access"} intro={checkout ? "Checkout is kept separate from the product explanation so you can make a clear decision before entering payment details." : "Cloud transcription is subscription-based. Your local recordings and previously saved files remain available if the subscription ends."}>
    <div className="mx-auto max-w-2xl rounded-lg border border-slate-300 bg-white p-8 shadow-lg"><p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Reporter monthly</p><p className="mt-4 text-5xl font-semibold text-slate-950">$39<span className="text-lg font-normal text-slate-500"> / month</span></p><ul className="mt-8 space-y-4 text-slate-700">{["Cloud transcription access for Depo-Pro Live","Audio-based speaker turns","Paragraphs and punctuation","Full transcript review workspace","Local recordings remain available"].map(item => <li key={item} className="flex gap-3"><Check className="h-5 w-5 text-emerald-600"/>{item}</li>)}</ul><a href={checkout ? "/app" : "/checkout"} className="mt-9 block rounded-md bg-blue-600 px-6 py-3 text-center font-semibold text-white hover:bg-blue-500">{checkout ? "Sign in to continue to secure checkout" : "View checkout"}</a><p className="mt-4 text-center text-xs text-slate-500">Test environment only. No real charges are enabled.</p></div>
  </Page>;
}

function Help() { return <Page title="Get started with Depo-Pro" intro="The web workspace and Windows capture application serve different parts of the same workflow."><div className="grid gap-5 md:grid-cols-2"><article className="rounded-lg bg-white p-7"><h2 className="text-xl font-semibold">Create and review transcripts</h2><p className="mt-3 leading-7 text-slate-600">Open the web workspace, sign in, create a case, import the source audio or transcript, then move through review and export.</p><a href="/app" className="mt-5 inline-block font-semibold text-blue-700">Open web workspace →</a></article><article className="rounded-lg bg-white p-7"><h2 className="text-xl font-semibold">Create a live draft on Windows</h2><p className="mt-3 leading-7 text-slate-600">Depo-Pro Live captures local audio and displays live text. It does not require Zoom; any supported microphone and system-audio source can be used.</p></article></div></Page>; }

function Legal({ terms = false }: { terms?: boolean }) { return <Page title={terms ? "Terms of use" : "Privacy"} intro={terms ? "These test-environment terms describe the intended service boundary." : "Deposition content requires careful handling. This page describes the product’s privacy direction for the test environment."}><div className="prose max-w-3xl rounded-lg bg-white p-8 text-slate-700"><h2 className="text-xl font-semibold text-slate-950">{terms ? "Working draft service" : "Data handling"}</h2><p className="mt-3 leading-7">{terms ? "Automated transcripts are working drafts and are not certified final transcripts. A qualified reporter remains responsible for review and certification." : "Credentials remain server-side. Access is account-scoped, and real customer deposition content must not be used in this non-production test environment."}</p></div></Page>; }

function Page({ title, intro, children }: { title: string; intro: string; children: ReactNode }) { return <main className="min-h-[calc(100vh-145px)] bg-slate-100"><section className="bg-slate-950 text-white"><div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">{intro}</p></div></section><section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">{children}</section></main>; }

export function SiteApp({ route }: { route: Exclude<SiteRoute, "workspace"> }) {
  return <div className="min-h-screen font-sans text-slate-900"><Header />{route === "home" && <Home />}{route === "features" && <Features />}{route === "pricing" && <Pricing />}{route === "checkout" && <Pricing checkout />}{route === "help" && <Help />}{route === "privacy" && <Legal />}{route === "terms" && <Legal terms />}<Footer /></div>;
}
