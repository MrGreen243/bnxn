"use client";
import * as React from "react";

const SECTIONS: { title: string; body: string[] }[] = [
  { title: "Getting around", body: ["Move with WASD or the arrow keys, drag the on-screen joystick on touch devices, or click/tap a spot to walk there.", "Walk up to a door or a person and press E (or the Interact button) to see what you can do there.", "Enter buildings marked with a door prompt: your room, the cybercafé and the HK headquarters have interiors.", "Open the World Map to travel between districts. New districts unlock through skills, money, reputation and quests — not money alone."] },
  { title: "Money, energy and days", body: ["Jobs lock in their reward when you start and pay when they finish. Reward ranges scale with skills and equipment.", "Energy is spent on jobs and regenerates over time. Food, resting at home or bars restore it.", "An in-game day is 20 real minutes. Rent, food, transport and upkeep are charged per day — also while you are away.", "Cash is exposed to busts; the bank is safer. Living costs draw from the bank if cash runs out."] },
  { title: "Idle and offline progress", body: ["Offline-eligible jobs, queued jobs, businesses, crew work and training continue while the app is closed, up to your offline cap (8 hours base; upgrades raise it).", "Progress is computed from saved timestamps when you return and shown in the welcome-back summary. Reloading never duplicates rewards."] },
  { title: "Skills and perks", body: ["Nine skills gain XP from work and training. Perks unlock automatically at levels 5, 10, 18 and 30 and change the economy: more slots, cheaper shops, faster jobs, better crews."] },
  { title: "Reputation", body: ["Street Rep, Fame, Credibility, Heat and Lifestyle are tracked separately. Risky work raises Street Rep and Heat; legit contracts raise Credibility; content and events raise Fame; luxury raises Lifestyle.", "High Heat triggers investigations. Lawyers, PR and lying low cool it. A court setback seizes cash and pauses you — it is recoverable, not game over."] },
  { title: "Hustler Kingdom (HK)", body: ["Reach Management 3 and talk to Tunde to begin 'Foundation of a Kingdom'. Meeting its requirements unlocks the HK.", "Rent a headquarters, recruit from the pool (set a fair share — recruits refuse offers below their minimum), assign work or training, and upgrade facilities.", "Each cycle: gross − operating costs = net; the member takes their share of net; the HK keeps the rest and it lands in your cash. Contracts change only while a member is idle and every change is logged.", "Morale drops with overcrowding, poor facilities and idleness; loyalty drops when cycles pay nothing or offers are refused. Members with no loyalty leave."] },
  { title: "Businesses and investments", body: ["Buy businesses in their district. They accrue net income into an uncollected pool (capped at 12 hours) — collect it in the portfolio or at the building.", "Upgrades raise revenue; your fame raises demand; the business skill tied to each type adds a bonus.", "The investment market is fictional and moves on its own. Buy low, sell high, or don't."] },
  { title: "Saving", body: ["The game autosaves every 15 seconds while something changed, when you switch tabs and when you leave. Export a JSON backup from Save Management; saves never leave this device."] },
  { title: "Legacy", body: ["At ₦500M net worth you may start a legacy run: economy resets, you keep achievements, cosmetics and permanent income bonuses. Entirely optional."] },
  { title: "Advertising", body: ["Sponsored banners are clearly labelled, never cover controls, and can be switched off in Settings. The ad dashboard (linked from the main menu) edits campaigns locally; published campaigns ship with the app."] },
];

export function HelpContent() {
  return (
    <div className="space-y-3 text-sm">
      {SECTIONS.map((s) => (
        <section key={s.title}>
          <h3 className="font-pixel mb-1 text-xs font-bold uppercase tracking-wide text-gold-400">{s.title}</h3>
          <ul className="list-inside list-disc space-y-1 text-xs text-ink-200">{s.body.map((b, i) => <li key={i}>{b}</li>)}</ul>
        </section>
      ))}
      <p className="text-[11px] text-ink-500">All characters, businesses, places and activities are fictional. Risky &lsquo;opportunities&rsquo; are abstract game mechanics with in-game consequences, not instructions.</p>
    </div>
  );
}

export function HelpScreen() {
  return <HelpContent />;
}
