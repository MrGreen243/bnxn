"use client";
import * as React from "react";
import { useUiStore, type ScreenId } from "@/store/uiStore";
import { Modal } from "@/components/ui";
import { AdSlot } from "@/components/ads/AdSlot";

const ProfileScreen = React.lazy(() => import("@/components/screens/ProfileScreen").then((m) => ({ default: m.ProfileScreen })));
const SkillsScreen = React.lazy(() => import("@/components/screens/SkillsScreen").then((m) => ({ default: m.SkillsScreen })));
const InventoryScreen = React.lazy(() => import("@/components/screens/InventoryScreen").then((m) => ({ default: m.InventoryScreen })));
const ActivitiesScreen = React.lazy(() => import("@/components/screens/ActivitiesScreen").then((m) => ({ default: m.ActivitiesScreen })));
const QuestsScreen = React.lazy(() => import("@/components/screens/QuestsScreen").then((m) => ({ default: m.QuestsScreen })));
const MapScreen = React.lazy(() => import("@/components/screens/MapScreen").then((m) => ({ default: m.MapScreen })));
const SocialScreen = React.lazy(() => import("@/components/screens/PhoneScreen").then((m) => ({ default: m.SocialScreen })));
const BankScreen = React.lazy(() => import("@/components/screens/BankScreen").then((m) => ({ default: m.BankScreen })));
const InvestmentsScreen = React.lazy(() => import("@/components/screens/BankScreen").then((m) => ({ default: m.InvestmentsScreen })));
const PropertyScreen = React.lazy(() => import("@/components/screens/LifestyleScreens").then((m) => ({ default: m.PropertyScreen })));
const GarageScreen = React.lazy(() => import("@/components/screens/LifestyleScreens").then((m) => ({ default: m.GarageScreen })));
const FashionScreen = React.lazy(() => import("@/components/screens/LifestyleScreens").then((m) => ({ default: m.FashionScreen })));
const BusinessScreen = React.lazy(() => import("@/components/screens/BusinessScreen").then((m) => ({ default: m.BusinessScreen })));
const HkScreen = React.lazy(() => import("@/components/management/HkScreen").then((m) => ({ default: m.HkScreen })));
const CrewScreen = React.lazy(() => import("@/components/management/CrewScreens").then((m) => ({ default: m.CrewScreen })));
const CrewMemberScreen = React.lazy(() => import("@/components/management/CrewScreens").then((m) => ({ default: m.CrewMemberScreen })));
const RecruitScreen = React.lazy(() => import("@/components/management/RecruitScreen").then((m) => ({ default: m.RecruitScreen })));
const TrainingScreen = React.lazy(() => import("@/components/management/TrainingScreen").then((m) => ({ default: m.TrainingScreen })));
const ContractsScreen = React.lazy(() => import("@/components/management/ContractsScreen").then((m) => ({ default: m.ContractsScreen })));
const StatsScreen = React.lazy(() => import("@/components/screens/StatsScreen").then((m) => ({ default: m.StatsScreen })));
const AchievementsScreen = React.lazy(() => import("@/components/screens/StatsScreen").then((m) => ({ default: m.AchievementsScreen })));
const SettingsScreen = React.lazy(() => import("@/components/screens/SettingsScreen").then((m) => ({ default: m.SettingsScreen })));
const SavesScreen = React.lazy(() => import("@/components/screens/SettingsScreen").then((m) => ({ default: m.SavesScreen })));
const HelpScreen = React.lazy(() => import("@/components/screens/HelpScreen").then((m) => ({ default: m.HelpScreen })));
const ShopScreen = React.lazy(() => import("@/components/screens/ShopScreen").then((m) => ({ default: m.ShopScreen })));
const EventsScreen = React.lazy(() => import("@/components/screens/PhoneScreen").then((m) => ({ default: m.EventsLogScreen })));
const DailyScreen = React.lazy(() => import("@/components/screens/PhoneScreen").then((m) => ({ default: m.DailyScreen })));

const TITLES: Record<ScreenId, string> = {
  profile: "Character", skills: "Skills & Perks", inventory: "Inventory & Equipment", activities: "Jobs & Opportunities", quests: "Quest Journal", map: "World Map & Travel",
  phone: "Phone", social: "Social Feed", bank: "Bank", investments: "Investments", property: "Property", garage: "Garage", fashion: "Fashion & Style", business: "Business Portfolio",
  hk: "Hustler Kingdom", crew: "Crew Roster", crewMember: "Crew Member", recruit: "Recruitment", training: "Training & Assignments", contracts: "Crew Contracts",
  stats: "Economy & Statistics", achievements: "Achievements", settings: "Settings", saves: "Save Management", help: "Help & Tutorial", shop: "Shop", events: "Event Log", daily: "Daily Objectives",
};

const WIDE: ScreenId[] = ["activities", "map", "business", "hk", "crew", "recruit", "training", "contracts", "stats", "skills", "inventory", "property", "garage", "fashion", "quests", "shop", "achievements"];
const WITH_BANNER: ScreenId[] = ["business", "hk", "crew", "recruit", "training", "contracts", "stats"];

export function ScreenHost() {
  const screen = useUiStore((s) => s.screen);
  const param = useUiStore((s) => s.screenParam);
  const close = useUiStore((s) => s.closeScreen);
  if (!screen) return null;
  const body = (() => {
    switch (screen) {
      case "profile": return <ProfileScreen />;
      case "skills": return <SkillsScreen />;
      case "inventory": return <InventoryScreen />;
      case "activities": return <ActivitiesScreen category={param} />;
      case "quests": return <QuestsScreen />;
      case "map": return <MapScreen />;
      case "social": return <SocialScreen />;
      case "bank": return <BankScreen />;
      case "investments": return <InvestmentsScreen />;
      case "property": return <PropertyScreen />;
      case "garage": return <GarageScreen />;
      case "fashion": return <FashionScreen />;
      case "business": return <BusinessScreen />;
      case "hk": return <HkScreen />;
      case "crew": return <CrewScreen />;
      case "crewMember": return <CrewMemberScreen memberId={param} />;
      case "recruit": return <RecruitScreen />;
      case "training": return <TrainingScreen memberId={param} />;
      case "contracts": return <ContractsScreen />;
      case "stats": return <StatsScreen />;
      case "achievements": return <AchievementsScreen />;
      case "settings": return <SettingsScreen />;
      case "saves": return <SavesScreen />;
      case "help": return <HelpScreen />;
      case "shop": return <ShopScreen shopId={param} />;
      case "events": return <EventsScreen />;
      case "daily": return <DailyScreen />;
      case "phone": return <SocialScreen />;
      default: return null;
    }
  })();
  return (
    <Modal title={TITLES[screen]} onClose={close} size={WIDE.includes(screen) ? "xl" : "md"} footer={WITH_BANNER.includes(screen) ? <AdSlot placement="management_banner" compact /> : undefined}>
      <React.Suspense fallback={<div className="p-6 text-center text-sm text-ink-400">Loading…</div>}>
        <div data-testid={`screen-${screen}`}>{body}</div>
      </React.Suspense>
    </Modal>
  );
}
