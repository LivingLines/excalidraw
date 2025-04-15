import React, { useEffect, useState } from "react";
import {HelpText, resetTraces, Symbol} from "./helpText";
import {
  onScrollChangeEvent,
  worldToCanvasCoordinates,
} from "./scrollPosition";
import { imagePaths } from "./imagePaths";
import {Trace} from "./trace";

interface Position {
  x: number;
  y: number;
}

let particlesSpawned = true;

export function FeedbackSymbols({
  traces,
  symbols,
}: {
  traces: Trace[];
  symbols: Symbol[];
}) {
  const [activeSymbol, setActiveSymbol] = useState<Symbol | null>(null);
  if (symbols.length == 0 && activeSymbol != null) setActiveSymbol(null);
  const onSymbolClicked = (symbol: Symbol) => {
    if (activeSymbol === symbol) {
      setActiveSymbol(null);
    }
    else setActiveSymbol(symbol);
  }

  if (activeSymbol == null)
    resetTraces();

  particlesSpawned = false;
  return (
    <>
      {symbols.map((symbol) => (
        <FeedbackSymbol
          key={crypto.randomUUID()}
          symbol={symbol}
          onClick={() => onSymbolClicked?.(symbol)}
        />
      ))}
      {activeSymbol && <HelpText traces={traces} symbol={activeSymbol} />}
    </>
  );
}

interface FeedbackSymbolProps {
  symbol: Symbol;
  onClick?: () => void | undefined;
}

function FeedbackSymbol({ symbol, onClick }: FeedbackSymbolProps) {
  const [position, setPosition] = useState<Position>(
    worldToCanvasCoordinates(symbol.position),
  );
  onScrollChangeEvent.push(() =>
    setPosition(worldToCanvasCoordinates(symbol.position)),
  ); // todo: event added but never removed

  const layerUIzIndex = 4;
  const img_src = symbol.correct
    ? imagePaths["check-in-circle.png"]
    : imagePaths["cross-in-circle.png"];
  const alt = symbol.correct ? "checkmark" : "cross";
  const height = 30;
  const particles = symbol.correct
    ? !particlesSpawned && <PartyParticles position={position} />
    : null;

  return (
    <>
      <img
        id="feedback-symbol"
        src={img_src}
        style={{
          marginLeft: -height / 2 + "px",
          marginTop: -height / 2 + "px",
          height: height + "px",
          zIndex: layerUIzIndex,
          left: position.x,
          top: position.y,
        }}
        onClick={onClick}
        alt={alt}
      />
      {particles}
    </>
  );
}

interface PartyParticlesProps {
  position: Position;
}

function PartyParticles({ position }: PartyParticlesProps) {
  const number_of_particle_groups = Math.floor(Math.random() * 5) + 1;
  return (
    <>
      {Array.from({ length: number_of_particle_groups }, (_, index) => (
        <ParticleGroup key={index} position={position} />
      ))}
    </>
  );
}

interface ParticleGroupProps {
  position: Position;
}

function ParticleGroup({ position }: ParticleGroupProps) {
  const particleCount = 10;
  const newPosition = {
    x: position.x + Math.random() * 50 - 25,
    y: position.y + Math.random() * 50 - 25,
  };
  return (
    <>
      {Array.from({ length: particleCount }, (_, index) => (
        <PartyParticle key={index} position={newPosition} />
      ))}
    </>
  );
}

interface PartyParticleProps {
  position: Position;
}

function PartyParticle({ position }: PartyParticleProps) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const duration = 400;
  const radius = 50;
  const color = `rgb(${Math.random() * 100}, ${Math.random() * 100 + 155}, ${
    Math.random() * 100
  })`;

  useEffect(() => {
    const startTime = performance.now();
    const offsetX = Math.random() * radius * 2 - radius;
    const offsetY = Math.random() * radius * 2 - radius;

    function animate() {
      const currentTime = performance.now();
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);

      setStyle({
        backgroundColor: color,
        left: position.x,
        top: position.y,
        transform: `translate(${offsetX * progress}px, ${
          offsetY * progress + 30 * progress ** 2
        }px)`,
        opacity: 1 - progress,
        width: 5 * (1 - progress),
        height: 5 * (1 - progress),
      });

      if (progress < 1) requestAnimationFrame(animate);
      else particlesSpawned = true;
    }

    requestAnimationFrame(animate);
  }, [position]);

  return <div className="particle" style={style}></div>;
}
