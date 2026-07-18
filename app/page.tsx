import type { Metadata } from "next";
import VeriVCApp from "./components/VeriVCApp";

export const metadata: Metadata = {
  title: "VeriVC — Evidence-driven startup diligence",
  description: "Verify startup claims, evidence, contradictions, risks, founder questions, and investment memos.",
};

export default function Home() {
  return <VeriVCApp />;
}
