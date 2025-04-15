import clsx from "clsx";

import { useTunnels } from "../../context/tunnels";
import {
  ExitZenModeAction,
  FinalizeAction, ShapesSwitcher,
  UndoRedoActions,
  ZoomActions,
} from "../Actions";
import { useDevice } from "../App";
import { Section } from "../Section";
import Stack from "../Stack";
import { t } from "../../i18n";

import type { ActionManager } from "../../actions/manager";
import type { UIAppState } from "../../types";
import { Island } from "../Island";
import {PenModeButton} from "@excalidraw/excalidraw/components/PenModeButton";
import {HandButton} from "@excalidraw/excalidraw/components/HandButton";
import {LaserPointerButton} from "@excalidraw/excalidraw/components/LaserPointerButton";
import {TOOL_TYPE} from "@excalidraw/excalidraw/constants";
import React from "react";
import {isHandToolActive} from "@excalidraw/excalidraw/appState";

const Footer = ({
  appState,
  actionManager,
  showExitZenModeBtn,
  renderWelcomeScreen,
  tunnels,
  onPenModeToggle,
  onHandToolToggle,
  UIOptions,
  app,
  isCollaborating,
}: {
  appState: UIAppState;
  actionManager: ActionManager;
  showExitZenModeBtn: boolean;
  renderWelcomeScreen: boolean;
  tunnels: any;
  onPenModeToggle: any;
  onHandToolToggle: any;
  UIOptions: any;
  app: any;
  isCollaborating: boolean;
}) => {
  const { FooterCenterTunnel, WelcomeScreenHelpHintTunnel } = useTunnels();

  const device = useDevice();
  const showFinalize =
    !appState.viewModeEnabled && appState.multiElement && device.isTouchScreen;

  return (
    <footer
      role="contentinfo"
      className="layer-ui__wrapper__footer App-menu App-menu_bottom"
    >
      <div
        className={clsx("layer-ui__wrapper__footer-left zen-mode-transition", {
          "layer-ui__wrapper__footer-left--transition-left":
            appState.zenModeEnabled,
        })}
      >
        <Stack.Col gap={2}>
          <Section heading="canvasActions">
            <ZoomActions
              renderAction={actionManager.renderAction}
              zoom={appState.zoom}
            />

            {!appState.viewModeEnabled && (
              <UndoRedoActions
                renderAction={actionManager.renderAction}
                className={clsx("zen-mode-transition", {
                  "layer-ui__wrapper__footer-left--transition-bottom":
                    appState.zenModeEnabled,
                })}
              />
            )}
            {showFinalize && (
              <FinalizeAction
                renderAction={actionManager.renderAction}
                className={clsx("zen-mode-transition", {
                  "layer-ui__wrapper__footer-left--transition-left":
                    appState.zenModeEnabled,
                })}
              />
            )}
          </Section>
        </Stack.Col>
      </div>
      <FooterCenterTunnel.Out />
      <div
        className={clsx("layer-ui__wrapper__footer-right zen-mode-transition", {
          "transition-right": appState.zenModeEnabled,
        })}
      >
        <div style={{ position: "relative" }}>
          {renderWelcomeScreen && <WelcomeScreenHelpHintTunnel.Out />}
          {!appState.viewModeEnabled &&
            appState.openDialog?.name !== "elementLinkSelector" && (
              <Section heading="shapes" className="shapes-section">
                {(heading: React.ReactNode) => (
                  <div style={{ position: "relative" }}>
                    {renderWelcomeScreen && (
                      <tunnels.WelcomeScreenToolbarHintTunnel.Out />
                    )}
                    <Stack.Col gap={4} align="start">
                      <Stack.Row
                        gap={1}
                        className={clsx("App-toolbar-container", {
                          "zen-mode": appState.zenModeEnabled,
                        })}
                      >
                        <Island
                          padding={1}
                          className={clsx("App-toolbar", {
                            "zen-mode": appState.zenModeEnabled,
                          })}
                        >
                          {heading}
                          <Stack.Row gap={1}>
                            <PenModeButton
                              zenModeEnabled={appState.zenModeEnabled}
                              checked={appState.penMode}
                              onChange={() => onPenModeToggle(null)}
                              title={t("toolBar.penMode")}
                              penDetected={appState.penDetected}
                            />

                            <HandButton
                              checked={isHandToolActive(appState)}
                              onChange={() => onHandToolToggle()}
                              title={t("toolBar.hand")}
                              isMobile
                            />

                            <ShapesSwitcher
                              appState={appState}
                              activeTool={appState.activeTool}
                              UIOptions={UIOptions}
                              app={app}
                            />
                          </Stack.Row>
                        </Island>
                        {isCollaborating && (
                          <Island
                            style={{
                              marginLeft: 8,
                              alignSelf: "center",
                              height: "fit-content",
                            }}
                          >
                            <LaserPointerButton
                              title={t("toolBar.laser")}
                              checked={
                                appState.activeTool.type === TOOL_TYPE.laser
                              }
                              onChange={() =>
                                app.setActiveTool({ type: TOOL_TYPE.laser })
                              }
                              isMobile
                            />
                          </Island>
                        )}
                      </Stack.Row>
                    </Stack.Col>
                  </div>
                )}
              </Section>
            )}
        </div>
      </div>
      <ExitZenModeAction
        actionManager={actionManager}
        showExitZenModeBtn={showExitZenModeBtn}
      />
    </footer>
  );
};

export default Footer;
Footer.displayName = "Footer";
