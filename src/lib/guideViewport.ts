export interface GuideViewport {
  width: number;
  height: number;
  left: number;
  top: number;
}

/** Visual viewport coordinates keep guide controls above mobile browser chrome. */
export function getGuideViewport(
  layoutWidth: number,
  layoutHeight: number,
  visual?: { width: number; height: number; offsetLeft: number; offsetTop: number } | null,
): GuideViewport {
  return {
    width: visual?.width || layoutWidth,
    height: visual?.height || layoutHeight,
    left: visual?.offsetLeft ?? 0,
    top: visual?.offsetTop ?? 0,
  };
}

export function getGuideDockLayout(viewport: GuideViewport, mobile: boolean, contentHeight?: number) {
  const height = Math.min(contentHeight ? Math.ceil(contentHeight) : Math.min(340, Math.max(180, Math.round(viewport.height * 0.34))), Math.max(1, viewport.height - 24));
  const width = Math.max(1, mobile ? viewport.width - 24 : Math.min(480, viewport.width - 48));
  return {
    height,
    width,
    left: viewport.left + (viewport.width - width) / 2,
    top: viewport.top + viewport.height - height - 12,
  };
}
