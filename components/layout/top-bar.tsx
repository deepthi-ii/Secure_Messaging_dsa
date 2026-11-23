"use client";

import * as React from "react";
import { Menu, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLab } from "@/lib/store/lab-store";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";
import { SidebarStatus } from "./sidebar-status";

export function TopBar() {
  const { ready, traffic, setTraffic, reset } = useLab();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  React.useEffect(() => {
    if (!confirmReset) return;
    const t = window.setTimeout(() => setConfirmReset(false), 3500);
    return () => window.clearTimeout(t);
  }, [confirmReset]);

  const onReset = async () => {
    if (!confirmReset) return setConfirmReset(true);
    setResetting(true);
    await reset();
    setResetting(false);
    setConfirmReset(false);
    toast.success("Demo reset", { description: "A fresh simulation was generated with new mock keys." });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md lg:px-8">
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Pages of SecureMessage Lab</SheetDescription>
          <div className="py-1">
            <Brand />
          </div>
          <SidebarNav onNavigate={() => setMenuOpen(false)} />
          <div className="mt-auto">
            <SidebarStatus />
          </div>
        </SheetContent>
      </Sheet>
      <div className="hidden sm:block lg:hidden">
        <span className="text-sm font-semibold">SecureMessage Lab</span>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <Switch id="traffic" checked={traffic} onCheckedChange={setTraffic} disabled={!ready} aria-describedby="traffic-hint" />
          <Label htmlFor="traffic" className="cursor-pointer text-sm whitespace-nowrap">
            <span className="hidden sm:inline">Simulate live traffic</span>
            <span className="sm:hidden">Live traffic</span>
          </Label>
          <span id="traffic-hint" className="sr-only">
            Sends random messages between mock users every two seconds, with occasional replay attempts.
          </span>
          {traffic && <span aria-hidden className="size-2 animate-pulse rounded-full bg-teal" />}
        </div>
        <Button variant={confirmReset ? "destructive" : "outline"} size="sm" onClick={onReset} disabled={!ready || resetting}>
          <RotateCcw className={resetting ? "animate-spin" : undefined} />
          <span className="hidden sm:inline">{confirmReset ? "Confirm reset" : "Reset demo"}</span>
          <span className="sm:hidden">{confirmReset ? "Confirm" : "Reset"}</span>
        </Button>
      </div>
    </header>
  );
}
