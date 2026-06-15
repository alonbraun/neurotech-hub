import { getAllFiles } from "@/lib/content";
import DirectoryClient from "./DirectoryClient";

export const metadata = {
  title: "NeuroTech Company Directory — NeuroTech.com",
  description: "Discover the leading neurotechnology companies — from brain-computer interfaces to cognitive health platforms.",
};

export default function DirectoryPage() {
  const companies = getAllFiles("companies") as any[];
  return <DirectoryClient companies={companies} />;
}
