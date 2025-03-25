let canvasPosition: { x: number; y: number } = { x: 0, y: 0 };
let canvasZoom: number = 1;

export const onScrollChangeEvent: Array<() => void> = [];

export const worldToCanvasCoordinates = (position: { x: number; y: number }): { x: number; y: number } => {
  return {
    x: (position.x + canvasPosition.x) * canvasZoom,
    y: (position.y + canvasPosition.y) * canvasZoom,
  };
};

export function updateScrollPosition(scroll: { x: number; y: number }) {
  const positionChanged = scroll.x !== canvasPosition.x || scroll.y !== canvasPosition.y;
  canvasPosition = scroll;
  if (positionChanged) onScrollChangeEvent.forEach(callback => callback());
}

export function updateZoom(zoom: number) {
  const zoomChanged = zoom !== canvasZoom;
  canvasZoom = zoom;
  if (zoomChanged) onScrollChangeEvent.forEach(callback => callback());
}
