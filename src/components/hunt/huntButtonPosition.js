export const HUNT_BUTTON_STORAGE_KEY = "yardit_hunt_button_position_v1";
const HUNT_BUTTON_SIZE = 70;
const HUNT_BUTTON_MARGIN = 16;

export function clampHuntButtonPosition(position, containerRect) {
  const viewport = window.visualViewport;
  let visibleBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
  const bottomNav = document.querySelector('.yardit-mobile-bottom-nav');
  if (bottomNav && bottomNav.getClientRects().length) {
    visibleBottom = Math.min(visibleBottom, bottomNav.getBoundingClientRect().top);
  }
  const visibleHeight = Math.max(0, Math.min(containerRect.bottom, visibleBottom) - containerRect.top);
  const maxX = Math.max(HUNT_BUTTON_MARGIN, containerRect.width - HUNT_BUTTON_SIZE - HUNT_BUTTON_MARGIN);
  const maxY = Math.max(HUNT_BUTTON_MARGIN, visibleHeight - HUNT_BUTTON_SIZE - HUNT_BUTTON_MARGIN);
  return {
    x: Math.min(Math.max(position.x, HUNT_BUTTON_MARGIN), maxX),
    y: Math.min(Math.max(position.y, HUNT_BUTTON_MARGIN), maxY)
  };
}

export function getDefaultHuntButtonPosition(containerRect) {
  return clampHuntButtonPosition({
    x: containerRect.width - HUNT_BUTTON_SIZE - HUNT_BUTTON_MARGIN,
    y: 112
  }, containerRect);
}