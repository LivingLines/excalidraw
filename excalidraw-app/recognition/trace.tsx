import {CaptureUpdateAction, newElementWith} from "@excalidraw/excalidraw";
import {ExcalidrawFreeDrawElement} from "@excalidraw/excalidraw/element/types";
import {ExcalidrawImperativeAPI} from "@excalidraw/excalidraw/types";

export class Trace {
  private freeDrawElement: ExcalidrawFreeDrawElement;
  private excalidrawAPI: ExcalidrawImperativeAPI | null;
  private originalColor?: string | null = null;
  private originalWidth: number | null = null;
  constructor(
    freeDrawElement: ExcalidrawFreeDrawElement,
    excalidrawAPI: ExcalidrawImperativeAPI | null,
  ) {
    this.freeDrawElement = freeDrawElement;
    this.excalidrawAPI = excalidrawAPI;
  }
  copy = () => new Trace(this.freeDrawElement, this.excalidrawAPI);
  get_x = () =>
    this.freeDrawElement.points.map(
      (point: number[]) => point[0] + this.freeDrawElement.x,
    );
  get_y = () =>
    this.freeDrawElement.points.map(
      (point: number[]) => point[1] + this.freeDrawElement.y,
    );
  get_id = () => this.freeDrawElement.id;
  serialize = (scale: number) => ({
    x: this.get_x().map((x: number) => x / scale),
    y: this.get_y().map((y: number) => y / scale),
    id: this.get_id(),
  });
  getColor = () => this.freeDrawElement.syntaxHighlighting;
  setColor(color: string) {
    const updatedElement = newElementWith(this.freeDrawElement, {
      syntaxHighlighting: color,
    });
    this.excalidrawAPI?.updateScene({
      elements: [
        ...this.excalidrawAPI
          .getSceneElements()
          .filter((el) => el.id !== this.freeDrawElement.id),
        updatedElement,
      ],
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  }
  greyOut(enable: boolean) {
    if (enable) {
      this.originalColor = this.freeDrawElement.syntaxHighlighting;
      this.originalWidth = this.freeDrawElement.strokeWidth;
      const updatedElement = newElementWith(this.freeDrawElement, {
        syntaxHighlighting: "#aaaaaa",
        // strokeWidth: this.freeDrawElement.strokeWidth * 0.7,
      });
      this.excalidrawAPI?.updateScene({
        elements: [
          ...this.excalidrawAPI
            .getSceneElements()
            .filter((el) => el.id !== this.freeDrawElement.id),
          updatedElement,
        ],
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    } else {
      if (this.originalColor !== null && this.originalWidth !== null) {
        const updatedElement = newElementWith(this.freeDrawElement, {
          syntaxHighlighting: this.originalColor,
          // strokeWidth: this.originalWidth,
        });
        this.originalColor = null
        this.originalWidth = null
        this.excalidrawAPI?.updateScene({
          elements: [
            ...this.excalidrawAPI
              .getSceneElements()
              .filter((el) => el.id !== this.freeDrawElement.id),
            updatedElement,
          ],
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      }
    }
  }
  // scaleWidth = (scale: number) =>
  //   (this.freeDrawElement = newElementWith(this.freeDrawElement, {
  //     strokeWidth: this.freeDrawElement.strokeWidth * scale,
  //   }));
}
