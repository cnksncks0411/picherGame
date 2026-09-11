import { Check, CircleHelp, Download, EllipsisVertical, Globe2, Plus, Settings, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppIcon } from "./AppIcon";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { useMouseDragPaging } from "../hooks/useMouseDragPaging";
import type { AppMetadata } from "../lib/appLibraryStore";

const APPS_PER_PAGE = 12;

interface LibraryViewProps {
  apps: AppMetadata[];
  launching: boolean;
  onLaunch: (app: AppMetadata) => void;
  onRequestDelete: (app: AppMetadata) => void;
  onOpenImport: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

export const LibraryView = ({
  apps,
  launching,
  onLaunch,
  onRequestDelete,
  onOpenImport,
  onOpenSettings,
  onOpenHelp,
}: LibraryViewProps) => {
  const pagesRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  const { canInstall, install } = useInstallPrompt();

  useMouseDragPaging(pagesRef);

  useEffect(() => {
    if (apps.length === 0) {
      setManageMode(false);
    }
  }, [apps.length]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [menuOpen]);

  // The trailing undefined is the "add app" tile, so it always ends the list.
  const entries: Array<AppMetadata | undefined> = [...apps, undefined];
  const pageCount = Math.ceil(entries.length / APPS_PER_PAGE);

  const runMenuAction = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  const scrollToPage = (index: number) => {
    const page = pagesRef.current?.firstElementChild;
    if (page) {
      pagesRef.current?.scrollTo({ left: index * page.clientWidth, behavior: "smooth" });
    }
  };

  return (
    <div className={manageMode ? "library-view manage-mode" : "library-view"}>
      <header className="library-header">
        <div className="brand-block">
          <strong className="brand-name">wie</strong>
          <h1>라이브러리</h1>
        </div>
        <div className="library-menu-wrap" ref={menuRef}>
          <button
            className="icon-button"
            type="button"
            title="메뉴"
            aria-label="메뉴"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(open => !open)}
          >
            <EllipsisVertical />
          </button>
          <div className={menuOpen ? "library-menu visible" : "library-menu"} role="menu">
            <button type="button" role="menuitem" onClick={runMenuAction(onOpenImport)}>
              <Plus />
              <span>앱 추가</span>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={apps.length === 0}
              aria-pressed={manageMode}
              onClick={runMenuAction(() => setManageMode(mode => !mode))}
            >
              {manageMode ? <Check /> : <Trash2 />}
              <span>{manageMode ? "삭제 완료" : "앱 삭제"}</span>
            </button>
            <button type="button" role="menuitem" onClick={runMenuAction(onOpenSettings)}>
              <Settings />
              <span>설정</span>
            </button>
            <button type="button" role="menuitem" onClick={runMenuAction(onOpenHelp)}>
              <CircleHelp />
              <span>조작 도움말</span>
            </button>
            {canInstall && (
              <button type="button" role="menuitem" onClick={runMenuAction(() => void install())}>
                <Download />
                <span>앱으로 설치</span>
              </button>
            )}
            <a href="https://github.com/dlunch/wie" target="_blank" rel="noopener noreferrer" role="menuitem">
              <Globe2 />
              <span>에뮬레이터 원본 프로젝트</span>
            </a>
          </div>
        </div>
      </header>

      <main className="library-main">
        <div
          className={pageCount > 1 ? "library-pages draggable" : "library-pages"}
          ref={pagesRef}
          aria-live="polite"
          onScroll={event => {
            const page = event.currentTarget.firstElementChild;
            if (page) {
              setPageIndex(Math.round(event.currentTarget.scrollLeft / page.clientWidth));
            }
          }}
        >
          {Array.from({ length: pageCount }, (_, index) => (
            <section
              key={index}
              className="library-page"
              aria-label={`${index + 1} / ${pageCount} 페이지`}
            >
              {entries.slice(index * APPS_PER_PAGE, (index + 1) * APPS_PER_PAGE).map((app, slot) =>
                app ? (
                  <div className="app-entry" key={app.id}>
                    <button
                      className="app-launch"
                      type="button"
                      title={app.title}
                      disabled={manageMode || launching}
                      onClick={() => onLaunch(app)}
                    >
                      <AppIcon app={app} />
                      <span className="app-title">{app.title}</span>
                    </button>
                    <button
                      className="delete-app-button"
                      type="button"
                      title={`${app.title} 삭제`}
                      aria-label={`${app.title} 삭제`}
                      onClick={() => onRequestDelete(app)}
                    >
                      <Trash2 />
                    </button>
                  </div>
                ) : (
                  <button className="app-entry add-app" type="button" title="앱 추가" aria-label="앱 추가" key={`add-${slot}`} onClick={onOpenImport}>
                    <span className="app-icon add-app-icon">
                      <Plus />
                    </span>
                    <span className="app-title">앱 추가</span>
                  </button>
                ),
              )}
            </section>
          ))}
        </div>
        <div className="page-indicators" aria-label="라이브러리 페이지" hidden={pageCount < 2}>
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              className={index === pageIndex ? "page-indicator active" : "page-indicator"}
              type="button"
              aria-label={`${index + 1} 페이지로 이동`}
              onClick={() => scrollToPage(index)}
            />
          ))}
        </div>
      </main>
    </div>
  );
};
