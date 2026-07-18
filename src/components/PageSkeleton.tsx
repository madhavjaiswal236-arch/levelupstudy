import React from 'react';

export function PageSkeleton() {
  return (
    <div className="w-full space-y-8 animate-pulse px-4 md:px-6">
      {/* Upper Status/Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b dark:border-white/5 border-black/5 pb-6">
        <div className="space-y-3">
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
      </div>

      {/* Grid of Key Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i} 
            className="p-6 rounded-2xl border dark:border-white/5 border-black/5 dark:bg-slate-900/40 bg-white/50 space-y-4 shadow-sm"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-5 w-5 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
            <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-3 w-44 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main Content Split View Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Large interactive area placeholder */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl border dark:border-white/5 border-black/5 dark:bg-slate-900/40 bg-white/50 space-y-6 shadow-sm">
            <div className="flex justify-between items-center border-b dark:border-white/5 border-black/5 pb-4">
              <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border-b dark:border-white/5 border-black/5 last:border-none">
                  <div className="flex items-center gap-4 w-2/3">
                    <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0" />
                    <div className="space-y-2 w-full">
                      <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                      <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    </div>
                  </div>
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Sidebar listing placeholder */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border dark:border-white/5 border-black/5 dark:bg-slate-900/40 bg-white/50 space-y-6 shadow-sm">
            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="p-4 rounded-xl border dark:border-white/5 border-black/5 dark:bg-slate-950/40 bg-slate-50 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="h-4.5 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    <div className="h-3.5 w-12 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  </div>
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-md" />
                  <div className="h-2 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PageSkeleton;
