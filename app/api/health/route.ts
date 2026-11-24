import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "securemessage-lab",
    simulation: true,
    notice: "Educational prototype. Not for real private communication.",
  });
}
