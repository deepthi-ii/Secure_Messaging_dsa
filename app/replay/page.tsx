import type { Metadata } from "next";
import { ReplayView } from "@/components/replay/replay-view";

export const metadata: Metadata = { title: "Replay protection" };

export default function ReplayPage() {
  return <ReplayView />;
}
