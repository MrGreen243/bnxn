import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-pixel text-3xl text-gold-400">Wrong turn, boss.</h1>
      <p className="text-ink-300">This page doesn&apos;t exist. Even the danfo conductor doesn&apos;t know it.</p>
      <Link href="/" className="rounded-md bg-gold-500 px-4 py-2 font-semibold text-ink-950">
        Back to the mainland
      </Link>
    </main>
  );
}
