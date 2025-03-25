import React, { useState, Dispatch, SetStateAction } from "react";
import { onScrollChangeEvent, worldToCanvasCoordinates } from "./scrollPosition";
import Latex from "react-latex-next";
import {imagePaths} from "./imagePaths";
import {Trace} from "./trace";

interface Position {
  x: number;
  y: number;
}

export interface Symbol {
  position: Position;
  feedback_texts: string[];
  feedback_ids: string[][];
  correct: boolean;
}

let greyed_out_traces: Trace[] = [];

export function resetTraces() {
  if (greyed_out_traces.length == 0) return;
  greyed_out_traces.forEach((trace) => trace?.greyOut(false));
  greyed_out_traces = []
}

export function HelpText({
  traces,
  symbol,
}: {
  traces: Trace[];
  symbol: Symbol;
}) {
  const [position, setPositionState] = useState<Position>(worldToCanvasCoordinates(symbol.position));
  const [feedbackIndex, setFeedbackIndexState] = useState<number>(0);

  onScrollChangeEvent.push(() => {
    setPositionState(worldToCanvasCoordinates(symbol.position));
  }); // TODO: not sure if this event is ever removed

  const space_to_the_right = window.innerWidth - position.x;
  if (space_to_the_right < -100) return <></>; // if the symbol is off-screen to the right

  const layerUIzIndex = 4;
  const feedback_text = symbol.feedback_texts[feedbackIndex];
  const min_width = 200;
  const render_direction = space_to_the_right > min_width ? "right" : "below";
  const left = render_direction === "right" ? position.x + "px" : "auto";
  const right = render_direction === "right" ? "auto" : 0;
  const top = position.y + "px";
  const triangle_right =
    space_to_the_right - 30 > 0 ? space_to_the_right - 30 + "px" : 0;
  const ids_to_highlight = symbol.feedback_ids[feedbackIndex];

  resetTraces();
  const traces_to_not_highlight = traces.filter(
    (trace) => !ids_to_highlight.includes(trace.get_id()),
  );
  traces_to_not_highlight.forEach((trace) => trace.greyOut(true));
  greyed_out_traces = traces_to_not_highlight

  return (
    <div
      id="speech-box"
      className={render_direction}
      style={{
        position: "absolute",
        left: left,
        right: right,
        top: top,
        zIndex: layerUIzIndex,
      }}
    >
      <div
        id="speech-box-triangle"
        style={{
          right: render_direction === "right" ? "auto" : triangle_right,
        }}
      ></div>
      <p id="help-text">
        <Latex>{feedback_text}</Latex>
      </p>
      <button
        type="button"
        className="hint-button"
        id="previous"
        style={{ display: feedbackIndex === 0 ? "none" : "block" }}
        onClick={() => setFeedbackIndexState(feedbackIndex - 1)}
      >
        <img src={imagePaths["grey_triangle.png"]} alt="prev hint" />
      </button>
      <button
        type="button"
        className="hint-button"
        id="next"
        style={{
          display:
            feedbackIndex === symbol.feedback_texts.length - 1
              ? "none"
              : "block",
        }}
        onClick={() => setFeedbackIndexState(feedbackIndex + 1)}
      >
        <img src={imagePaths["grey_triangle.png"]} alt="next hint" />
      </button>
    </div>
  );
}
