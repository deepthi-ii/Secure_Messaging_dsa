import type { Metadata } from "next";
import { KeysView } from "@/components/keys/keys-view";

export const metadata: Metadata = { title: "Key management" };

export default function KeysPage() {
  return <KeysView />;
}
