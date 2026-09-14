// A browser reloads an <iframe> whenever it is moved in the DOM, and a panel
// is moved when its tab changes group or its pane crosses between the sidebar
// and the main area. So the workbench keeps every frame in one fixed layer at
// the end of the document, and lays each over a placeholder inside the panel
// that owns it. The placeholder moves with the panel; the frame follows it
// without moving. `AppFrame` is how a plugin uses this.
export interface FrameLayer {
  // Where a frame is rendered. It is the plugin's own element — a `ref` on
  // `AppFrame` reaches it — so the plugin can post to its window and tell its
  // own messages from another panel's.
  container: HTMLElement;
  // Draws `frame` over `placeholder` and keeps it there as the placeholder
  // moves, resizes, scrolls or is clipped, until the returned function runs.
  attach: (frame: HTMLElement, placeholder: HTMLElement) => () => void;
}
