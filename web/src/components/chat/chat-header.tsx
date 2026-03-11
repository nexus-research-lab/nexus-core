"use client";

import { memo } from "react";
import { Activity, PanelTop } from "lucide-react";

interface ChatHeaderProps {
  sessionKey: string | null;
  isLoading: boolean;
}


const ChatHeader = memo(({sessionKey, isLoading}: ChatHeaderProps) => {
  return (
    <div className="flex h-12 items-center justify-between border-b border-border/80 bg-white/70 px-5 backdrop-blur-sm z-10">
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <PanelTop size={14}/>
        <span>SESSION</span>
        <span className="text-border">/</span>
        <span className="text-accent">
          {sessionKey ? ` ${sessionKey}` : "NEW_SESSION"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-border/80 bg-white/80 px-3 py-1.5">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          {isLoading ? (
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-[pulse_1s_ease-in-out_infinite]"/>
              <div className="w-2 h-2 rounded-full bg-primary animate-[pulse_1s_ease-in-out_0.2s_infinite]"/>
              <div className="w-2 h-2 rounded-full bg-accent animate-[pulse_1s_ease-in-out_0.4s_infinite]"/>
            </div>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-primary/20"/>
              <div className="w-2 h-2 rounded-full bg-primary/40"/>
              <div className="w-2 h-2 rounded-full bg-accent"/>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

ChatHeader.displayName = "ChatHeader";

export default ChatHeader;
