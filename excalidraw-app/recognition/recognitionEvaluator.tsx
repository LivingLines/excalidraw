// This file is used to evaluate the user's input and display the result
import React, { useState, useEffect } from 'react';
import {Line, RecognitionLines} from "./recognitionLine";
import {FeedbackSymbols} from "./feedbackSymbol";
import {resetTraces, Symbol} from "./helpText";
import {Trace} from "./trace";
import './index.scss';
import {onScrollChangeEvent} from "./scrollPosition";

const oneNoteColorPalette = {
  "default": "#000000",
  "equals": "#fdbf14",
  "number": "#004e8a",
  "letter": "#008b3a",
  "cell_background": "#fdfdfd",
  "cell_border": "#ceebfb"
};

const motivationalTexts = [
  "Super! Du hast das Mathe-Monster besiegt!",
  "Weiter so! Mathe-Jedi du werden wirst!",
  "Gut gemacht! Mathe hat keine Chance gegen dich!",
  "Richtig! Du bist ein wahrer Mathe-Meister!",
  "Perfekt! Du rockst die Zahlenwelt!",
  "Sehr gut! Mathe-Ninja im Anmarsch!",
  // ... other texts
];

interface RecognitionEvaluatorProps {
  traces: Trace[];
}

let lastTraceIds: string[] = [];
let lastGraph : string | null = null;

function RecognitionEvaluator({traces}: RecognitionEvaluatorProps){
  onScrollChangeEvent.length = 0
  resetTraces()

  const [lines, setLines] = useState<Line[]>([]);
  const [symbols, setSymbols] = useState<Symbol[]>([]);

  const updateRecognition = async () => {
    const traceIds = traces.map(trace => trace.get_id());
    if (lastTraceIds.sort().join() === traceIds.sort().join())
      return; // traces did not change
    lastTraceIds = traceIds;

    const serializedTraces = traces.map(trace => trace.serialize(80));

    if (traces.length === 0) {
      setLines([]);
      setSymbols([]);
      return
    }

    try {
      console.log("Sending recognition request")
      if (symbols.length > 0) setSymbols([]);
      const response = await fetch('http://localhost:5000/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traces: serializedTraces, graph: lastGraph }),
        credentials: 'include'
      });
      const result = await response.json();
      if (JSON.stringify(lastTraceIds) != JSON.stringify(traceIds)) return; // traces changed while processing the response
      if (lastGraph == result.graph) {
        return;
      }
      lastGraph = result.graph
      applyRecognition(result.trace_groups, result.lines);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  type TraceGroup = [string[], string];
  type StringLine = [string[], string];

  const applyRecognition = (traceGroups: TraceGroup[], lines: StringLine[]) => {
    const idsToTraces: { [key: string]: Trace } = traces.reduce((acc: { [key: string]: Trace }, trace: Trace) => {
      acc[trace.get_id()] = trace;
      return acc;
    }, {});

    // Colorize trace groups
    traceGroups.forEach(([traceIds, symbol] : [string[], string]) => {
      const color = getColorForCharacter(symbol);
      traceIds.map((id: string) => idsToTraces[id]).forEach((trace: Trace) => trace.setColor(color));
    });

    // Draw recognition lines
    const recognitionLines = lines.map(([traceIds, formula] : [string[], string]) => {
      const traceY = traceIds.map((id: string) => idsToTraces[id].get_y());
      const traceX = traceIds.map((id: string) => idsToTraces[id].get_x());
      const minY = Math.min(...traceY.flat());
      const maxX = Math.max(...traceX.flat());
      const minX = Math.min(...traceX.flat());
      const xPos = (maxX + minX) / 2;
      return { position: { x: xPos, y: minY }, text: formula };
    });
    setLines(recognitionLines)
    setSymbols([])
  };

  const getHints = async () => {
    const tracesArrays = traces.map(trace => trace.serialize(80));
    if (traces.length === 0) return;

    try {
      const response = await fetch("http://localhost:5000/hints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          graph: lastGraph,
          traces: tracesArrays,
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const result = await response.json();
      if (traces.length !== tracesArrays.length) return; // traces changed while processing the response

      const idsToTraces = traces.reduce((acc, trace) => {
        acc[trace.get_id()] = trace;
        return acc;
      }, {} as { [key: string]: Trace });

      const feedbackSymbols: Symbol[] = [];
      const hints = result.hints;

      for (const hint of hints) {
        const equationTraceIds = hint[0];
        const equationTraces:Trace[] = equationTraceIds.map((id:string) => idsToTraces[id]);
        let maxX = Number.MIN_SAFE_INTEGER;
        let maxY = Number.MIN_SAFE_INTEGER;
        let minY = Number.MAX_SAFE_INTEGER;
        const tracesY = equationTraces.map(tg => tg.get_y());
        const tracesX = equationTraces.map(tg => tg.get_x());
        for (const traceX of tracesX) {
          maxX = Math.max(maxX, Math.max(...traceX));
        }
        for (const traceY of tracesY) {
          maxY = Math.max(maxY, Math.max(...traceY));
          minY = Math.min(minY, Math.min(...traceY));
        }
        const position = { x: maxX + 40, y: (maxY + minY) / 2 };

        const helpTexts = hint[1].map((hint: any) => hint[0]);
        let feedbackSymbol: Symbol | null = null;
        if (helpTexts.length === 0) {
          const randomIndex = Math.floor(Math.random() * motivationalTexts.length);
          feedbackSymbol = {
            correct: true,
            feedback_texts: [motivationalTexts[randomIndex]],
            feedback_ids: [equationTraceIds],
            position: position,
          };
        } else {
          const traceIds = hint[1].map((hint: any) => hint[1]);
          for (let i = 0; i < traceIds.length; i++) {
            traceIds[i] = traceIds[i].length === 0 ? equationTraceIds : traceIds[i];
          }
          feedbackSymbol = {
            correct: false,
            feedback_texts: helpTexts,
            feedback_ids: traceIds,
            position: position,
          };
        }
        feedbackSymbols.push(feedbackSymbol);
      }
      setSymbols(feedbackSymbols);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const getColorForCharacter = (c:string) => {
    if (c === "=") return oneNoteColorPalette["equals"];
    if (c.length === 1 && c.match(/[0-9]/)) return oneNoteColorPalette["number"];
    if (c.length === 1 && c.match(/[a-zA-Z]/)) return oneNoteColorPalette["letter"];
    return oneNoteColorPalette["default"];
  };

  updateRecognition().then();

  return (
    <div id={"feedback-container"}>
      <RecognitionLines lines={lines} />
      <FeedbackSymbols traces={traces} symbols={symbols}/>
      <div className={"right-buttons"}>
        <button className={"check-solution"} onClick={getHints}>
          Prüfen
        </button>
      </div>
    </div>
  );
};

export default RecognitionEvaluator;
