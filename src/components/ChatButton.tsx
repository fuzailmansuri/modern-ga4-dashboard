"use client";

import React from "react";
import Link from "next/link";

/**
 * Floating ChatButton placed at bottom-right. Links to the /chat page.
 * Keep styling and behavior isolated so this can be removed/reverted easily.
 */
export function ChatButton() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Link href="/chat" aria-label="Open chat">
        <button className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4a2 2 0 00-2 2v14l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" />
          </svg>
        </button>
      </Link>
    </div>
  );
}
