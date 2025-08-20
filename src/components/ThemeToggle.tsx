"use client";

/**
 * ThemeToggle
 * Small control to switch between light, dark and system themes. Uses `useTheme` from ThemeProvider.
 */
import React, { useEffect, useState } from "react";
import { useTheme } from "~/contexts/ThemeProvider";

export function ThemeToggle() {
  // Theme support disabled; render nothing to simplify UI and avoid Tailwind build issues.
  return null;
}
