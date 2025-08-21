"use client";

import React from "react";

interface LoadingSkeletonProps {
  className?: string;
  variant?: "card" | "table" | "chart" | "text" | "avatar" | "button";
  count?: number;
}

export function LoadingSkeleton({ 
  className = "", 
  variant = "card", 
  count = 1 
}: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case "card":
        return (
          <div className="animate-pulse space-y-4 rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="h-6 w-48 rounded bg-muted"></div>
              <div className="h-8 w-20 rounded bg-muted"></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-16 rounded bg-muted"></div>
              <div className="h-16 rounded bg-muted"></div>
              <div className="h-16 rounded bg-muted"></div>
            </div>
            <div className="h-48 rounded bg-muted"></div>
          </div>
        );

      case "table":
        return (
          <div className="animate-pulse rounded-lg border border-border bg-card overflow-hidden">
            <div className="border-b border-border bg-muted/50 p-4">
              <div className="h-5 w-32 rounded bg-muted"></div>
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4">
                  <div className="h-4 w-48 rounded bg-muted"></div>
                  <div className="h-4 w-20 rounded bg-muted"></div>
                  <div className="h-4 w-20 rounded bg-muted"></div>
                  <div className="h-4 w-20 rounded bg-muted"></div>
                </div>
              ))}
            </div>
          </div>
        );

      case "chart":
        return (
          <div className="animate-pulse space-y-4 rounded-lg border border-border bg-card p-6">
            <div className="h-6 w-40 rounded bg-muted"></div>
            <div className="h-64 rounded bg-muted"></div>
            <div className="flex justify-center space-x-4">
              <div className="h-4 w-16 rounded bg-muted"></div>
              <div className="h-4 w-16 rounded bg-muted"></div>
              <div className="h-4 w-16 rounded bg-muted"></div>
            </div>
          </div>
        );

      case "text":
        return (
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-full rounded bg-muted"></div>
            <div className="h-4 w-5/6 rounded bg-muted"></div>
            <div className="h-4 w-4/6 rounded bg-muted"></div>
          </div>
        );

      case "avatar":
        return (
          <div className="animate-pulse">
            <div className="h-10 w-10 rounded-full bg-muted"></div>
          </div>
        );

      case "button":
        return (
          <div className="animate-pulse">
            <div className="h-10 w-24 rounded-lg bg-muted"></div>
          </div>
        );

      default:
        return (
          <div className="animate-pulse">
            <div className="h-4 w-full rounded bg-muted"></div>
          </div>
        );
    }
  };

  if (count === 1) {
    return <div className={className}>{renderSkeleton()}</div>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </div>
  );
}

// Specific skeleton components for common use cases
export function CardSkeleton({ className = "" }: { className?: string }) {
  return <LoadingSkeleton variant="card" className={className} />;
}

export function TableSkeleton({ className = "" }: { className?: string }) {
  return <LoadingSkeleton variant="table" className={className} />;
}

export function ChartSkeleton({ className = "" }: { className?: string }) {
  return <LoadingSkeleton variant="chart" className={className} />;
}

export function TextSkeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <LoadingSkeleton key={i} variant="text" />
      ))}
    </div>
  );
}