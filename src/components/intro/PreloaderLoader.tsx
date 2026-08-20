"use client";

import dynamic from "next/dynamic";

// next/dynamic with ssr:false is only allowed inside a Client Component —
// this file's sole job is to be that boundary so the Server Component
// layout can still just render <PreloaderLoader /> plainly.
const Preloader = dynamic(() => import("@/components/intro/Preloader"), { ssr: false });

export default function PreloaderLoader() {
  return <Preloader />;
}
