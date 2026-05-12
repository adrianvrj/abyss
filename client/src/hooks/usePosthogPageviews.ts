import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { captureSpaPageview } from "@/lib/posthog";

/** SPA manual pageviews (React Router does not trigger full reloads). */
export function usePosthogPageviews() {
  const location = useLocation();

  useEffect(() => {
    captureSpaPageview();
  }, [location.pathname, location.search]);
}
