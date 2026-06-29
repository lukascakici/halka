import type { Metadata } from "next";
import { HowItWorks } from "@/components/HowItWorks";

export const metadata: Metadata = {
  title: "How it works — Halka",
  description:
    "How Halka works: create or join a savings circle, contribute each round, and receive the pot in turn — on-chain on Stellar.",
};

export default function HowItWorksPage() {
  return <HowItWorks />;
}
