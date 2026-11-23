import type { Metadata } from "next";
import { MerkleView } from "@/components/merkle/merkle-view";

export const metadata: Metadata = { title: "Merkle verification" };

export default function MerklePage() {
  return <MerkleView />;
}
