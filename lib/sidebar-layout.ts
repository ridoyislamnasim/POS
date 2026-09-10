/** Shared sidebar dimensions and motion — keep layout in sync across shell + sidebar. */
export const SIDEBAR_WIDTH_EXPANDED_PX = 168;
export const SIDEBAR_WIDTH_COLLAPSED_PX = 48;
export const SIDEBAR_WIDTH_MOBILE_PX = 212;
export const SIDEBAR_HEADER_HEIGHT_PX = 40;
export const TOPBAR_HEIGHT_PX = 48;

export const sidebarTransition = {
  type: "tween" as const,
  duration: 0.18,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

export const sidebarSpring = {
  type: "spring" as const,
  stiffness: 480,
  damping: 38,
  mass: 0.7,
};

export const sidebarHover = { duration: 0.12, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

export function sidebarWidthForViewport(collapsed: boolean, viewportWidth: number): number {
  if (viewportWidth < 992) return SIDEBAR_WIDTH_MOBILE_PX;
  return collapsed ? SIDEBAR_WIDTH_COLLAPSED_PX : SIDEBAR_WIDTH_EXPANDED_PX;
}
