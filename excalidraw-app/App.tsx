import {
  Excalidraw,
  TTDDialogTrigger,
  CaptureUpdateAction,
} from "@excalidraw/excalidraw";
import { trackEvent } from "@excalidraw/excalidraw/analytics";
import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import {
  CommandPalette,
  DEFAULT_CATEGORIES,
} from "@excalidraw/excalidraw/components/CommandPalette/CommandPalette";
import { ErrorDialog } from "@excalidraw/excalidraw/components/ErrorDialog";
import { OverwriteConfirmDialog } from "@excalidraw/excalidraw/components/OverwriteConfirm/OverwriteConfirm";
import {
  VERSION_TIMEOUT,
} from "@excalidraw/excalidraw/constants";
import polyfill from "@excalidraw/excalidraw/polyfill";
import React, { useEffect, useRef, useState } from "react";
import { useCallbackRefState } from "@excalidraw/excalidraw/hooks/useCallbackRefState";
import { t } from "@excalidraw/excalidraw/i18n";
import {
  getVersion,
  getFrame,
  resolvablePromise,
  isRunningInIframe,
} from "@excalidraw/excalidraw/utils";
import { isElementLink } from "@excalidraw/excalidraw/element/elementLink";
import { newElementWith } from "@excalidraw/excalidraw/element/mutateElement";
import clsx from "clsx";
import {
  useHandleLibrary,
} from "@excalidraw/excalidraw/data/library";

import type { RestoredDataState } from "@excalidraw/excalidraw/data/restore";
import type {
  ExcalidrawFreeDrawElement,
  NonDeletedExcalidrawElement,
  OrderedExcalidrawElement,
} from "@excalidraw/excalidraw/element/types";
import {
  AppState,
  ExcalidrawImperativeAPI,
  BinaryFiles,
  ExcalidrawInitialDataState,
  NormalizedZoomValue,
} from "@excalidraw/excalidraw/types";
import type { ResolvablePromise } from "@excalidraw/excalidraw/utils";
import {
  Provider,
  useAtomValue,
  appJotaiStore,
} from "./app-jotai";
import { TopErrorBoundary } from "./components/TopErrorBoundary";

import {
  exportToBackend,
  loadScene,
} from "./data";

import {
  importFromLocalStorage,
} from "./data/localStorage";
import {
  LibraryIndexedDBAdapter,
  LibraryLocalStorageMigrationAdapter,
  LocalData,
} from "./data/LocalData";
import { useHandleAppTheme } from "./useHandleAppTheme";
import { useAppLangCode } from "./app-language/language-state";
import DebugCanvas, {
  debugRenderer,
  isVisualDebuggerEnabled,
  loadSavedDebugState,
} from "./components/DebugCanvas";

// LivingLines stuff
import {updateScrollPosition, updateZoom} from "./recognition/scrollPosition";
import {Trace} from "./recognition/trace";
import RecognitionEvaluator from "./recognition/recognitionEvaluator";

import "./index.scss";

polyfill();

window.EXCALIDRAW_THROTTLE_RENDER = true;

declare global {
  interface BeforeInstallPromptEventChoiceResult {
    outcome: "accepted" | "dismissed";
  }

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<BeforeInstallPromptEventChoiceResult>;
  }
}

let pwaEvent: BeforeInstallPromptEvent | null = null;

let isSelfEmbedding = false;

if (window.self !== window.top) {
  try {
    const parentUrl = new URL(document.referrer);
    const currentUrl = new URL(window.location.href);
    if (parentUrl.origin === currentUrl.origin) {
      isSelfEmbedding = true;
    }
  } catch (error) {
    // ignore
  }
}

const initializeScene = async (): Promise<{
  scene: ExcalidrawInitialDataState | null;
  isExternalScene: boolean;
}> => {
  const searchParams = new URLSearchParams(window.location.search);
  window.location.hash.match(
    /^#json=([a-zA-Z0-9_-]+),([a-zA-Z0-9_-]+)$/,
  );
  window.location.hash.match(/^#url=(.*)$/);
  try {
    const localDataState = importFromLocalStorage();
    let scene: RestoredDataState & {
      scrollToContent?: boolean;
    } = await loadScene(null, null, localDataState);

    // Ensure we always return a valid scene object
    return {
      scene: scene || { elements: [], appState: {} },
      isExternalScene: false
    };
  } catch (error) {
    console.error("Error initializing scene:", error);
    return {
      scene: {
        appState: {
          errorMessage: t("alerts.invalidSceneUrl"),
        },
      },
      isExternalScene: false,
    };
  }
};

interface ExcalidrawWrapperProps {
  onAppStateChanged?: (appState: AppState) => void;
  onScrollChange?: (scrollX: number, scrollY: number, zoom: Readonly<{value: NormalizedZoomValue;}>) => void;
  onPointerDown?: (activeTool: AppState["activeTool"]) => void;
  onPointerUp?: (activeTool: AppState["activeTool"]) => void;
  excalidrawAPIRef?: (api: ExcalidrawImperativeAPI) => void;
  onChangeEvent?: (elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => void;
}

const ExcalidrawWrapper: React.FC<ExcalidrawWrapperProps> = ({ onAppStateChanged,
                                                               onScrollChange,
                                                               onPointerDown,
                                                               onPointerUp,
                                                               excalidrawAPIRef,
                                                               onChangeEvent}) => {
  const [errorMessage, setErrorMessage] = useState("");
  isRunningInIframe();
  const { editorTheme} = useHandleAppTheme();

  const [langCode] = useAppLangCode();

  // initial state
  // ---------------------------------------------------------------------------

  const initialStatePromiseRef = useRef<{
    promise: ResolvablePromise<ExcalidrawInitialDataState | null>;
  }>({ promise: null! });
  if (!initialStatePromiseRef.current.promise) {
    initialStatePromiseRef.current.promise =
      resolvablePromise<ExcalidrawInitialDataState | null>();
  }

  const debugCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    trackEvent("load", "frame", getFrame());
    // Delayed so that the app has a time to load the latest SW
    setTimeout(() => {
      trackEvent("load", "version", getVersion());
    }, VERSION_TIMEOUT);
  }, []);

  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();

  useEffect(() => {
    if (excalidrawAPI && excalidrawAPIRef) {
      excalidrawAPIRef(excalidrawAPI);
    }
  }, [excalidrawAPI, excalidrawAPIRef]);
  useHandleLibrary({
    excalidrawAPI,
    adapter: LibraryIndexedDBAdapter,
    // TODO maybe remove this in several months (shipped: 24-03-11)
    migrationAdapter: LibraryLocalStorageMigrationAdapter,
  });

  const [, forceRefresh] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) {
      const debugState = loadSavedDebugState();

      if (debugState.enabled && !window.visualDebug) {
        window.visualDebug = {
          data: [],
        };
      } else {
        delete window.visualDebug;
      }
      forceRefresh((prev) => !prev);
    }
  }, [excalidrawAPI]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const sceneData = await initializeScene();
        initialStatePromiseRef.current.promise.resolve(sceneData.scene);
      } catch (error) {
        console.error("Error initializing scene:", error);
        initialStatePromiseRef.current.promise.resolve(null);
      }
    };

    if (excalidrawAPI) {
      initialize();
    }
  }, [excalidrawAPI]);

  const onChange = (
    elements: readonly OrderedExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    if (onChangeEvent) onChangeEvent(elements, appState, files);
    if (onAppStateChanged) {
      onAppStateChanged(appState);
    }

    // this check is redundant, but since this is a hot path, it's best
    // not to evaludate the nested expression every time
    if (!LocalData.isSavePaused()) {
      LocalData.save(elements, appState, files, () => {
        if (excalidrawAPI) {
          let didChange = false;

          const elements = excalidrawAPI
            .getSceneElementsIncludingDeleted()
            .map((element) => {
              if (
                LocalData.fileStorage.shouldUpdateImageElementStatus(element)
              ) {
                const newElement = newElementWith(element, { status: "saved" });
                if (newElement !== element) {
                  didChange = true;
                }
                return newElement;
              }
              return element;
            });

          if (didChange) {
            excalidrawAPI.updateScene({
              elements,
              captureUpdate: CaptureUpdateAction.NEVER,
            });
          }
        }
      });
    }

    // Render the debug scene if the debug canvas is available
    if (debugCanvasRef.current && excalidrawAPI) {
      debugRenderer(
        debugCanvasRef.current,
        appState,
        window.devicePixelRatio,
        () => forceRefresh((prev) => !prev),
      );
    }
  };

  const onExportToBackend = async (
    exportedElements: readonly NonDeletedExcalidrawElement[],
    appState: Partial<AppState>,
    files: BinaryFiles,
  ) => {
    if (exportedElements.length === 0) {
      throw new Error(t("alerts.cannotExportEmptyCanvas"));
    }
    try {
      const { url, errorMessage } = await exportToBackend(
        exportedElements,
        {
          ...appState,
          viewBackgroundColor: appState.exportBackground
            ? appState.viewBackgroundColor
            : getDefaultAppState().viewBackgroundColor,
        },
        files,
      );

      if (errorMessage) {
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        const { width, height } = appState;
        console.error(error, {
          width,
          height,
          devicePixelRatio: window.devicePixelRatio,
        });
        throw new Error(error.message);
      }
    }
  };

  // browsers generally prevent infinite self-embedding, there are
  // cases where it still happens, and while we disallow self-embedding
  // by not whitelisting our own origin, this serves as an additional guard
  if (isSelfEmbedding) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          height: "100%",
        }}
      >
        <h1>I'm not a pretzel!</h1>
      </div>
    );
  }

  return (
    <div
      style={{ height: "100%" }}
      className={clsx("excalidraw-app", {
        "is-collaborating": false,
      })}
    >
      <Excalidraw
        aiEnabled={false}
        gridModeEnabled={true}
        excalidrawAPI={excalidrawRefCallback}
        onChange={onChange}
        onPointerDown={onPointerDown || undefined}
        onPointerUp={onPointerUp || undefined}
        onScrollChange={onScrollChange}
        initialData={initialStatePromiseRef.current.promise}
        UIOptions={{
          canvasActions: {
            toggleTheme: true,
            export: {
              onExportToBackend
            },
          },
        }}
        langCode={langCode}
        detectScroll={false}
        handleKeyboardGlobally={true}
        autoFocus={true}
        theme={editorTheme}
        onLinkOpen={(element, event) => {
          if (element.link && isElementLink(element.link)) {
            event.preventDefault();
            excalidrawAPI?.scrollToContent(element.link, { animate: true });
          }
        }}
      >
        <OverwriteConfirmDialog>
          <OverwriteConfirmDialog.Actions.ExportToImage />
          <OverwriteConfirmDialog.Actions.SaveToDisk />
        </OverwriteConfirmDialog>

        <TTDDialogTrigger />

        {errorMessage && (
          <ErrorDialog onClose={() => setErrorMessage("")}>
            {errorMessage}
          </ErrorDialog>
        )}

        <CommandPalette
          customCommandPaletteItems={[
            {
              label: t("labels.installPWA"),
              category: DEFAULT_CATEGORIES.app,
              predicate: () => !!pwaEvent,
              perform: () => {
                if (pwaEvent) {
                  pwaEvent.prompt();
                  pwaEvent.userChoice.then(() => {
                    // event cannot be reused, but we'll hopefully
                    // grab new one as the event should be fired again
                    pwaEvent = null;
                  });
                }
              },
            },
          ]}
        />
        {isVisualDebuggerEnabled() && excalidrawAPI && (
          <DebugCanvas
            appState={excalidrawAPI.getAppState()}
            scale={window.devicePixelRatio}
            ref={debugCanvasRef}
          />
        )}
      </Excalidraw>
    </div>
  );
};

const ExcalidrawApp = () => {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [excalidrawAPI, excalidrawRefCallback] = useCallbackRefState<ExcalidrawImperativeAPI>();

  // update scroll position and zoom for recognition module
  function onScrollChange(scrollX: number, scrollY: number, zoom: Readonly<{value: NormalizedZoomValue;}>) {
    updateScrollPosition({ x: scrollX, y: scrollY });
    updateZoom(zoom.value)
  }
  function getFreeDrawElements(elements: readonly OrderedExcalidrawElement[]) {
    return elements.filter(
      element => isExcalidrawFreeDrawElement(element) && !element.isDeleted
    ) as ExcalidrawFreeDrawElement[];
  }
  // check if elements are equal to traces
  function didTracesChange(elements: readonly OrderedExcalidrawElement[]) {
    let freeDrawElements = getFreeDrawElements(elements);
    if (freeDrawElements.length !== traces.length) return true;
    const traceIds = traces.map(trace => trace.get_id());
    for (let freeDrawElement of freeDrawElements) {
      if (!traceIds.includes(freeDrawElement.id)) return true;
    }
    return false;
  }

  function isExcalidrawFreeDrawElement(element: NonDeletedExcalidrawElement) {
    return element.type === 'freedraw' && element.index !== null && typeof element.index === 'string';
  }
  function updateTracesIfNecessary(activeTool: AppState["activeTool"]) {
    // console.log(activeTool);
    // if (!(activeTool in ["freedraw", "eraser"])) return
    const elements = excalidrawAPI?.getSceneElements()
    if (elements == null) {
      if (traces.length == 0) return;
      else setTraces([])
      return;
    }
    if (!didTracesChange(elements)) return
    let freeDrawElements = getFreeDrawElements(elements);
    let new_traces = freeDrawElements?.map(e => new Trace(e, excalidrawAPI)) || [];
    setTraces(new_traces);
  }

  function onChangeEvent(elements: readonly OrderedExcalidrawElement[], state: AppState) {
    if (state.newElement != null || !didTracesChange(elements)) return
    let freeDrawElements = getFreeDrawElements(elements);
    let new_traces = freeDrawElements?.map(e => new Trace(e, excalidrawAPI)) || [];
    setTraces(new_traces);
  }

  return (
    <TopErrorBoundary>
      <Provider store={appJotaiStore}>
        <RecognitionEvaluator
          traces={traces}
        />
        <ExcalidrawWrapper
          excalidrawAPIRef={excalidrawRefCallback}
          onScrollChange={onScrollChange}
          onChangeEvent={onChangeEvent}
        />
      </Provider>
    </TopErrorBoundary>
  );
};

export default ExcalidrawApp;
