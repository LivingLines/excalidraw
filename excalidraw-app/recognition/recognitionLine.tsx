import React, { useState, Dispatch, SetStateAction } from 'react';
import { onScrollChangeEvent, worldToCanvasCoordinates } from './scrollPosition';
import Latex from 'react-latex-next';

export interface Position {
  x: number;
  y: number;
}

export interface Line {
  position: Position;
  text: string;
}

export function RecognitionLines({ lines }: { lines: Line[] }) {
  return (
    <>
      {lines.map((line:Line) => (
        <RecognitionLine key={crypto.randomUUID()} line={line} />
      ))}
    </>
  );
}

function RecognitionLine({ line }: {line: Line}) {
  const [position, setPosition] = useState(worldToCanvasCoordinates(line.position));
  onScrollChangeEvent.push(() => setPosition(worldToCanvasCoordinates(line.position)));

  return (
    <div className="recognition-line" style={{ top: position.y, left: position.x, zIndex: 4 }}>
      <Latex>{`$${line.text}$`}</Latex>
    </div>
  );
}
