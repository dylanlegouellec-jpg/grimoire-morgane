import type { AppDiagnostics } from "../../hooks/useAppDiagnostics";
import { formatBytes, type ReportSection } from "../../utils/diagnostics";

/* ------------------------------------------------------------------ */
/*  Les lignes des sections "Application" et "Appareil & performance" du  */
/*  Panneau de Diagnostics, construites UNE seule fois : ce sont les       */
/*  mêmes lignes qui s'affichent à l'écran (AppDiagnostics.tsx) et qui      */
/*  partent dans le rapport copié (utils/diagnostics.ts, buildDiagnosticsReport),  */
/*  pour que les deux ne puissent jamais se contredire.                              */
/* ------------------------------------------------------------------ */

type Translate = (key: string, vars?: Record<string, unknown>) => string;

function serviceWorkerLabel(info: AppDiagnostics["serviceWorker"], t: Translate): string {
  if (!info) return "…";
  if (info.state === "unsupported") return t("diagnostics.swUnsupported");
  if (info.state === "none") return t("diagnostics.swNone");
  if (info.state === "installing") return t("diagnostics.swInstalling");
  if (info.state === "waiting") return t("diagnostics.swWaiting");
  return info.controlling ? t("diagnostics.swActiveControlling") : t("diagnostics.swActive");
}

export function buildAppSections(info: AppDiagnostics, t: Translate): ReportSection[] {
  const { build, mode, address, device, load, serviceWorker } = info;
  const builtAt = build.builtAt ? new Date(build.builtAt).toLocaleString("fr-FR") : "";
  const dash = "—";
  return [
    {
      title: t("diagnostics.appTitle"),
      rows: [
        [
          t("diagnostics.appVersion"),
          builtAt ? t("diagnostics.appVersionValue", { commit: build.commit, date: builtAt }) : build.commit,
        ],
        [t("diagnostics.appMode"), mode === "standalone" ? t("diagnostics.modeStandalone") : t("diagnostics.modeBrowser")],
        [t("diagnostics.swLabel"), serviceWorkerLabel(serviceWorker, t)],
        [t("diagnostics.appAddress"), address],
      ],
    },
    {
      title: t("diagnostics.deviceTitle"),
      rows: [
        [t("diagnostics.screen"), device.screen],
        [t("diagnostics.viewport"), `${device.viewport} · ${t(device.orientation === "portrait" ? "diagnostics.portrait" : "diagnostics.landscape")}`],
        [t("diagnostics.languageTimezone"), `${device.language} · ${device.timezone}`],
        [
          t("diagnostics.network"),
          `${device.online ? t("diagnostics.networkOnline") : t("diagnostics.networkOffline")}${device.connection ? ` · ${device.connection}` : ""}`,
        ],
        [t("diagnostics.browser"), device.userAgent],
        [
          t("diagnostics.pageLoad"),
          load.domContentLoadedMs == null && load.loadMs == null
            ? dash
            : t("diagnostics.pageLoadValue", { dom: load.domContentLoadedMs ?? dash, full: load.loadMs ?? dash }),
        ],
        [t("diagnostics.resources"), load.resourceCount ? `${load.resourceCount} · ${formatBytes(load.resourceBytes)}` : dash],
      ],
    },
  ];
}
