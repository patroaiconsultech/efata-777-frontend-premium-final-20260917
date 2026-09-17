/**
 * PatroAI immersive landing V3.8.2 — Mobile Stabilization + Canonical Audio.
 *
 * Contract:
 * - first interaction is an explicit immersive audio consent gate;
 * - audio.play() is invoked inside the original user gesture;
 * - sound/reactivity are delegated to the canonical premiumInteractions audio graph;
 * - starfield + aurora consume live --music-* variables;
 * - no decorative orbit/ring geometry;
 * - mobile is the primary composition;
 * - /access contract remains untouched.
 */
import { useEffect, useRef, useState } from "react";

type V37ImmersiveProps = {
  onPrivateAccess: () => void | Promise<void>;
};

type Stage = "intro" | "lobby" | "exiting" | "content";

type AudioCommandAction = "start" | "pause" | "toggle" | "stop";

type AudioCommandDetail = {
  action: AudioCommandAction;
  requestId: string;
  reset?: boolean;
};

type AudioResultDetail = {
  requestId: string;
  ok: boolean;
  playing: boolean;
  error?: string;
};

const EXIT_DURATION_MS = 820;
const PRIVATE_EXIT_DURATION_MS = 560;
const AUDIO_COMMAND_EVENT = "patroai:v38-audio-command";
const AUDIO_RESULT_EVENT = "patroai:v38-audio-result";

const nodes = [
  ["01", "Cocriação", "#cocriacao"],
  ["02", "Governança", "#governanca"],
  ["03", "ESG", "#governanca"],
  ["04", "ROI", "#metodo"],
  ["05", "Ecossistema", "#ecossistema"],
  ["06", "Contato", "#contato"],
] as const;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getImmersiveAudio() {
  return document.getElementById(
    "patroaiImmersiveAudio",
  ) as HTMLAudioElement | null;
}

function sendAudioCommand(action: AudioCommandAction, reset = false) {
  const requestId = `v382-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return new Promise<AudioResultDetail>((resolve) => {
    const timeout = window.setTimeout(() => {
      document.removeEventListener(AUDIO_RESULT_EVENT, onResult as EventListener);
      resolve({
        requestId,
        ok: false,
        playing: false,
        error: "A experiência sonora não respondeu a tempo.",
      });
    }, 1800);

    function onResult(event: Event) {
      const detail = (event as CustomEvent<AudioResultDetail>).detail;
      if (!detail || detail.requestId !== requestId) return;
      window.clearTimeout(timeout);
      document.removeEventListener(AUDIO_RESULT_EVENT, onResult as EventListener);
      resolve(detail);
    }

    document.addEventListener(AUDIO_RESULT_EVENT, onResult as EventListener);
    document.dispatchEvent(
      new CustomEvent<AudioCommandDetail>(AUDIO_COMMAND_EVENT, {
        detail: { action, requestId, reset },
      }),
    );
  });
}

export function V37Immersive({ onPrivateAccess }: V37ImmersiveProps) {
  const [stage, setStage] = useState<Stage>("intro");
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");
  const coreRef = useRef<HTMLDivElement | null>(null);
  const exitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const body = document.body;
    body.classList.toggle("v37-immersive-open", stage !== "content");

    return () => {
      body.classList.remove("v37-immersive-open");
    };
  }, [stage]);

  useEffect(
    () => () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const track = getImmersiveAudio();
    if (!track) return;

    const onPlay = () => {
      setPlaying(true);
      setAudioError("");
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    track.addEventListener("play", onPlay);
    track.addEventListener("pause", onPause);
    track.addEventListener("ended", onEnded);
    setPlaying(!track.paused);

    return () => {
      track.removeEventListener("play", onPlay);
      track.removeEventListener("pause", onPause);
      track.removeEventListener("ended", onEnded);
    };
  }, []);

  const finishContentExit = (target: string) => {
    setStage("content");
    window.requestAnimationFrame(() => {
      document.querySelector(target)?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    });
  };

  const exitTo = (target: string) => {
    if (stage !== "lobby") return;

    if (prefersReducedMotion()) {
      finishContentExit(target);
      return;
    }

    setStage("exiting");
    exitTimerRef.current = window.setTimeout(
      () => finishContentExit(target),
      EXIT_DURATION_MS,
    );
  };

  const enterPrivateAccess = () => {
    if (stage !== "lobby") return;

    if (prefersReducedMotion()) {
      void onPrivateAccess();
      return;
    }

    setStage("exiting");
    exitTimerRef.current = window.setTimeout(
      () => void onPrivateAccess(),
      PRIVATE_EXIT_DURATION_MS,
    );
  };

  const enterImmersive = async (withSound: boolean) => {
    if (stage !== "intro") return;

    if (!withSound) {
      const result = await sendAudioCommand("stop", true);
      setPlaying(false);
      setAudioError(result.ok ? "" : result.error || "");
      setStage("lobby");
      return;
    }

    // CustomEvent dispatch is synchronous. premiumInteractions receives this
    // command inside the original tap/click activation and invokes both
    // AudioContext resume + HTMLMediaElement play before its first await.
    const result = await sendAudioCommand("start", true);
    setPlaying(result.playing);
    setAudioError(
      result.ok
        ? ""
        : result.error ||
          "Não foi possível iniciar o áudio. Toque no controle para tentar novamente.",
    );
    setStage("lobby");
  };

  const toggleAudio = async () => {
    const result = await sendAudioCommand("toggle");
    setPlaying(result.playing);
    setAudioError(result.ok ? "" : result.error || "Não foi possível alterar o áudio.");
  };

  if (stage === "content") return null;

  return (
    <section
      className={`v37-immersive v38-immersive v37-immersive--${stage}`}
      data-audio-active={playing ? "true" : "false"}
      aria-label="Experiência imersiva PatroAI"
    >
      <div className="v37-atmosphere" aria-hidden="true" />

      <div className="v38-aurora" aria-hidden="true">
        <i className="v38-aurora__band v38-aurora__band--gold" />
        <i className="v38-aurora__band v38-aurora__band--cyan" />
        <i className="v38-aurora__band v38-aurora__band--violet" />
      </div>

      <div className="v37-stars v37-stars--base" aria-hidden="true" />
      <div className="v37-stars v37-stars--low" aria-hidden="true" />
      <div className="v37-stars v37-stars--mid" aria-hidden="true" />
      <div className="v37-stars v37-stars--high" aria-hidden="true" />

      {stage === "intro" ? (
        <div className="v38-entry" role="dialog" aria-modal="true" aria-labelledby="v38-entry-title">
          <div className="v38-entry__halo" aria-hidden="true" />
          <img
            className="v38-entry__mark"
            src="/assets/patroai-logo-integrated.png"
            alt=""
          />
          <p className="v38-entry__eyebrow">PATROAI · EXPERIÊNCIA IMERSIVA</p>
          <h1 id="v38-entry-title">Esta é uma página imersiva.</h1>
          <p className="v38-entry__copy">
            A experiência combina imagem, atmosfera e uma faixa sonora reativa.
            Escolha como deseja entrar.
          </p>
          <div className="v38-entry__actions">
            <button
              className="v38-entry__sound"
              type="button"
              onClick={() => void enterImmersive(true)}
            >
              <span aria-hidden="true">♪</span>
              <strong>Entrar com som</strong>
            </button>
            <button
              className="v38-entry__silent"
              type="button"
              onClick={() => void enterImmersive(false)}
            >
              Entrar sem som
            </button>
          </div>
          <small>Você poderá alterar o áudio depois.</small>
        </div>
      ) : null}

      <div
        className="v37-lobby"
        aria-hidden={stage === "intro" ? "true" : undefined}
        onPointerMove={(event) => {
          if (stage !== "lobby" || prefersReducedMotion()) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - bounds.left) / bounds.width - 0.5;
          const y = (event.clientY - bounds.top) / bounds.height - 0.5;
          coreRef.current?.style.setProperty("--core-x", `${(x * 7).toFixed(2)}px`);
          coreRef.current?.style.setProperty("--core-y", `${(y * 5).toFixed(2)}px`);
        }}
        onPointerLeave={() => {
          coreRef.current?.style.setProperty("--core-x", "0px");
          coreRef.current?.style.setProperty("--core-y", "0px");
        }}
      >
        <header className="v37-lobby__header">
          <span>PATROAI · NÚCLEO IMERSIVO</span>
          <button type="button" onClick={() => exitTo("#top")}>
            Ir para apresentação
          </button>
        </header>

        <div
          ref={coreRef}
          className="v37-core"
          role="img"
          aria-label="Núcleo audiovisual PatroAI"
        >
          <span className="v37-core__glow" aria-hidden="true" />
          <video
            aria-label="Vídeo em loop do núcleo PatroAI"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/assets/patroai-logo-integrated.png"
            src="/media/patroai-v37-logo-loop.mp4"
          />
        </div>

        <nav className="v37-lobby__nodes" aria-label="Rotas da experiência imersiva">
          {nodes.map(([index, label, target], nodeIndex) => (
            <button
              key={label}
              className={`v37-node v37-node--${nodeIndex + 1}`}
              type="button"
              onClick={() => exitTo(target)}
            >
              <em>{index}</em>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <button
          className="v37-access"
          type="button"
          onClick={enterPrivateAccess}
        >
          Acessar Plataforma
        </button>

        <div
          className="v37-dock"
          aria-label="Controle da experiência sonora"
        >
          <button
            type="button"
            onClick={() => void toggleAudio()}
            aria-label={playing ? "Pausar música" : "Reproduzir música"}
          >
            {playing ? "Ⅱ" : "▶"}
          </button>
          <span>{audioError || "FAIXA IMERSIVA"}</span>
        </div>
      </div>
    </section>
  );
}
