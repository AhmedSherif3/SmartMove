"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRegion } from "@/lib/context/RegionContext";
import { Loader2 } from "lucide-react";

interface DashboardEmbedProps {
  pageId: "overview" | "investment" | "risk" | "trends";
}

export default function DashboardEmbed({ pageId }: DashboardEmbedProps) {
  const { region } = useRegion();
  const [loading, setLoading] = useState(true);
  const [iframeHeight, setIframeHeight] = useState("1000px");
  const [isMobile, setIsMobile] = useState(false);
  const [scale, setScale] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [refreshId] = useState(() => Date.now());

  // When region or pageId changes, we update the iframe src
  const src = React.useMemo(() => {
    if (region === "Dubai") {
      switch (pageId) {
        case "overview":
          return "https://app.fabric.microsoft.com/view?r=eyJrIjoiY2UwZjgwNjctMzNmZC00MDIzLTk0NmUtZDcwY2E1OGI4NWJlIiwidCI6ImQ2YjE1ZGYwLTYyNTUtNDVlYi1hNGFhLTc4NjM0ZDc5Y2U4OCJ9&pageName=94cfa0e04d266e70a13d&navContentPaneEnabled=false";
        case "trends":
          return "https://app.fabric.microsoft.com/view?r=eyJrIjoiY2UwZjgwNjctMzNmZC00MDIzLTk0NmUtZDcwY2E1OGI4NWJlIiwidCI6ImQ2YjE1ZGYwLTYyNTUtNDVlYi1hNGFhLTc4NjM0ZDc5Y2U4OCJ9&pageName=35bf2b388c0b10ecde85&navContentPaneEnabled=false";
        case "investment":
          return "https://app.fabric.microsoft.com/view?r=eyJrIjoiY2UwZjgwNjctMzNmZC00MDIzLTk0NmUtZDcwY2E1OGI4NWJlIiwidCI6ImQ2YjE1ZGYwLTYyNTUtNDVlYi1hNGFhLTc4NjM0ZDc5Y2U4OCJ9&pageName=e8385234e71ee64d394b&navContentPaneEnabled=false";
        case "risk":
          return "https://app.fabric.microsoft.com/view?r=eyJrIjoiY2UwZjgwNjctMzNmZC00MDIzLTk0NmUtZDcwY2E1OGI4NWJlIiwidCI6ImQ2YjE1ZGYwLTYyNTUtNDVlYi1hNGFhLTc4NjM0ZDc5Y2U4OCJ9&pageName=05c7d9465c3d0db34897&navContentPaneEnabled=false";
        default:
          return null;
      }
    }
    const countryFolder = region.toLowerCase(); // "england" or "egypt"
    return `/dashboards/${countryFolder}/index.html?hideSidebar=true&_refresh=${refreshId}#page-${pageId}`;
  }, [region, pageId, refreshId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);

      if (region === "Dubai") {
        if (mobile) {
          setIframeHeight("486px");
          if (window.innerWidth < 800) {
            setScale(window.innerWidth / 800);
          } else {
            setScale(1);
          }
        } else {
          setIframeHeight("1000px");
          setScale(1);
        }
        return;
      }
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
          if (doc && doc.documentElement) {
            const height = doc.documentElement.scrollHeight || doc.body.scrollHeight;
            setIframeHeight(`${height + 30}px`);
          }
        } catch (e) {
          // Fallback in case of CORS or access issues
          setIframeHeight("1200px");
        }
      }
    };

    const handleLoad = () => {
      setLoading(false);
      // Resize on load
      setTimeout(handleResize, 100);
      // Double check after maps/charts animations render
      setTimeout(handleResize, 500);
    };

    const frame = iframeRef.current;
    if (frame) {
      frame.addEventListener("load", handleLoad);
    }
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      if (frame) frame.removeEventListener("load", handleLoad);
      window.removeEventListener("resize", handleResize);
    };
  }, [src, region]);

  const isDubaiMobile = region === "Dubai" && isMobile;

  return (
    <div className="w-full flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-transparent">
      <div 
        className="relative w-full overflow-hidden bg-transparent"
        style={{ 
          height: isDubaiMobile ? `${486 * scale}px` : (region === "Dubai" ? '1000px' : iframeHeight),
        }}
      >
        {loading && (
        <div className="absolute inset-0 z-10 flex min-h-[400px] items-center justify-center bg-surface-card/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        </div>
      )}
      {src && (
        <iframe
          ref={iframeRef}
          src={src}
          className="border-0 bg-transparent"
          title={`${region} ${pageId} Dashboard`}
          scrolling="no"
          allowFullScreen={true}
          style={{ 
            display: loading ? 'none' : 'block', 
            height: region === "Dubai" ? "calc(100% + 38px)" : "100%",
            width: isDubaiMobile ? "800px" : "100%",
            transform: isDubaiMobile ? `scale(${scale})` : 'none',
            transformOrigin: 'top left',
            marginBottom: region === "Dubai" ? "-38px" : "0"
          }}
        />
      )}
      </div>
    </div>
  );
}