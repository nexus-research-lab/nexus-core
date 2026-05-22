export function OperationStageMotionStyles() {
  return (
    <style>
      {`
        @keyframes nexus-operation-window-enter {
          0% { opacity: 0; transform: translate3d(0, 14px, 0) scale(0.985); filter: blur(3px); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
        }

        @keyframes nexus-operation-window-float {
          0%, 100% {
            translate:
              var(--operation-window-drag-x, 0px)
              var(--operation-window-drag-y, 0px);
          }
          50% {
            translate:
              var(--operation-window-drag-x, 0px)
              calc(var(--operation-window-drag-y, 0px) - 3px);
          }
        }

        @keyframes nexus-operation-preview-line {
          0% { opacity: 0; transform: translateX(-8px); }
          100% { opacity: 1; transform: translateX(0); }
        }

        @keyframes nexus-operation-scan {
          0% { transform: translateY(-18px); opacity: 0; }
          12% { opacity: 0.85; }
          100% { transform: translateY(180px); opacity: 0; }
        }

        @keyframes nexus-operation-shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }

        @keyframes nexus-operation-caret {
          0%, 45% { opacity: 1; }
          46%, 100% { opacity: 0; }
        }

        @keyframes nexus-operation-pulse-width {
          0%, 100% { transform: scaleX(0.86); opacity: 0.7; }
          50% { transform: scaleX(1); opacity: 1; }
        }

        @keyframes nexus-operation-focus-dot {
          0%, 100% { transform: translate(-50%, -50%) scale(0.72); opacity: 0.52; }
          50% { transform: translate(-50%, -50%) scale(1.4); opacity: 1; }
        }

        @keyframes nexus-operation-scene-enter {
          0% {
            opacity: 0.12;
            transform:
              translate3d(
                var(--operation-scene-enter-x, 0),
                var(--operation-scene-enter-y, 14px),
                0
              )
              scale(.992);
            filter: blur(5px);
          }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }

        @keyframes nexus-operation-idle-exit {
          0% { opacity: 1; transform: scale(1); filter: blur(0); }
          46% { opacity: .68; filter: blur(.5px); }
          100% {
            opacity: 0;
            transform:
              translate3d(
                var(--operation-idle-exit-x, 0),
                var(--operation-idle-exit-y, 0),
                0
              )
              scale(var(--operation-idle-exit-scale, 1.035));
            filter: blur(var(--operation-idle-exit-blur, 4px));
          }
        }

        @keyframes nexus-operation-idle-particles-yield {
          0% { opacity: .94; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
          38% { opacity: .82; transform: translate3d(0, -2px, 0) scale(.99); filter: blur(.2px); }
          100% {
            opacity: 0;
            transform:
              translate3d(
                calc(var(--operation-idle-exit-x, 0) * .42),
                calc(var(--operation-idle-exit-y, 0) * .42),
                0
              )
              scale(.86);
            filter: blur(2.5px);
          }
        }

        @keyframes nexus-operation-idle-pulse {
          0%, 100% { opacity: .9; transform: translate3d(0, 0, 0) scale(1); }
          50% { opacity: 1; transform: translate3d(0, -2px, 0) scale(1.006); }
        }

        @keyframes nexus-operation-boot-signal {
          0% { opacity: 0; transform: translate3d(0, 12px, 0) scale(.985); filter: blur(4px); }
          42% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
          100% { opacity: .88; transform: translate3d(0, -4px, 0) scale(1.006); filter: blur(.2px); }
        }

        @keyframes nexus-operation-boot-line {
          0% { transform: scaleX(.12); opacity: .3; }
          48% { transform: scaleX(.76); opacity: .88; }
          100% { transform: scaleX(1); opacity: .72; }
        }

        @keyframes nexus-operation-event-signal {
          0% { opacity: 0; transform: translate3d(-50%, -10px, 0) scale(.985); filter: blur(3px); }
          20% { opacity: 1; transform: translate3d(-50%, 0, 0) scale(1); filter: blur(0); }
          78% { opacity: 1; transform: translate3d(-50%, 0, 0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translate3d(-50%, -4px, 0) scale(1.006); filter: blur(.8px); }
        }

        @keyframes nexus-operation-materializing-signal {
          0% { opacity: 0; transform: translate3d(8px, -8px, 0) scale(.985); filter: blur(3px); }
          22% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
          100% { opacity: .92; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
        }

        @keyframes nexus-operation-materializing-line {
          0% { transform: scaleX(.18); opacity: .42; }
          55% { transform: scaleX(.82); opacity: .9; }
          100% { transform: scaleX(1); opacity: .78; }
        }

        .operation-stage-window {
          animation:
            nexus-operation-window-enter 420ms cubic-bezier(.18,.88,.24,1) both,
            nexus-operation-window-float 7.5s ease-in-out infinite;
          animation-delay: var(--operation-delay, 0ms), calc(var(--operation-delay, 0ms) + 420ms);
          transform-origin: 50% 60%;
        }

        .operation-stage-window-focus {
          box-shadow:
            0 32px 82px rgba(34,48,72,.18),
            0 0 0 1px rgba(255,255,255,.72),
            0 0 24px rgba(91,114,255,.12);
        }

        .operation-stage-window-dragging {
          animation-play-state: paused;
          box-shadow:
            0 36px 90px rgba(34,48,72,.22),
            0 0 0 1px rgba(255,255,255,.78),
            0 0 28px rgba(91,114,255,.14);
        }

        .operation-stage-narrative-awakening .operation-stage-aura {
          opacity: .36;
          transform: translate(-50%, -50%) scale(.82);
        }

        .operation-stage-narrative-running .operation-stage-light {
          opacity: .88;
        }

        .operation-stage-narrative-settling .operation-stage-window,
        .operation-stage-narrative-completed .operation-stage-window {
          animation-duration: 420ms, 11s;
        }

        .operation-preview-line {
          animation: nexus-operation-preview-line 320ms ease-out both;
          animation-delay: var(--operation-delay, 0ms);
        }

        .operation-scan-line {
          position: absolute;
          left: 0;
          right: 0;
          top: 42px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(91,114,255,.46), rgba(79,162,159,.36), transparent);
          animation: nexus-operation-scan 2.6s ease-in-out infinite;
        }

        .operation-stage-gridlines {
          background-image:
            linear-gradient(rgba(71,85,105,.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(71,85,105,.045) 1px, transparent 1px);
          background-size: 34px 34px;
          mask-image: radial-gradient(circle at 50% 45%, black, transparent 72%);
        }

        .operation-stage-light {
          position: absolute;
          left: 50%;
          top: -130px;
          width: 560px;
          height: 430px;
          border-radius: 50%;
          transform: translateX(-50%);
          background: radial-gradient(circle, rgba(255,255,255,.74), rgba(91,114,255,.12) 38%, transparent 70%);
          filter: blur(10px);
          pointer-events: none;
        }

        .operation-desktop-shadow {
          position: absolute;
          left: 8%;
          right: 8%;
          bottom: 48px;
          height: 32px;
          border-radius: 50%;
          background: rgba(66,80,102,.16);
          filter: blur(22px);
          pointer-events: none;
        }

        .operation-terminal-caret {
          display: inline-block;
          width: 7px;
          height: 14px;
          margin-left: 2px;
          background: #d9ffe5;
          animation: nexus-operation-caret 1s step-end infinite;
        }

        .operation-web-loading {
          position: relative;
          overflow: hidden;
        }

        .operation-web-loading::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,.18) 42%, transparent 62%);
          transform: translateX(-120%);
          animation: nexus-operation-shimmer 2.2s ease-in-out infinite;
        }

        .operation-diff-bar {
          height: 10px;
          border-radius: 999px;
          transform-origin: left center;
          animation: nexus-operation-pulse-width 1.8s ease-in-out infinite;
        }

        .operation-phase-meter {
          animation: nexus-operation-pulse-width 1.6s ease-in-out infinite;
          transform-origin: left center;
        }

        .operation-focus-dot {
          animation: nexus-operation-focus-dot 1.8s ease-in-out infinite;
        }

        .operation-stage-scene-enter {
          animation: nexus-operation-scene-enter 920ms cubic-bezier(.16,.84,.24,1) both;
        }

        .operation-idle-stage-exit {
          animation: nexus-operation-idle-exit 920ms cubic-bezier(.16,.84,.24,1) both;
          background: transparent !important;
        }

        .operation-idle-stage-exit .operation-idle-sky,
        .operation-idle-stage-exit .operation-idle-grid,
        .operation-idle-stage-exit .operation-idle-dotfield {
          opacity: 0;
          transition: opacity 180ms ease-out;
        }

        .operation-idle-stage-exit .operation-idle-particle-canvas {
          animation: nexus-operation-idle-particles-yield 920ms cubic-bezier(.16,.84,.24,1) both;
        }

        .operation-idle-stage-exit .operation-idle-agent-pill,
        .operation-idle-stage-exit .operation-idle-status-card,
        .operation-idle-stage-exit .operation-idle-clock {
          opacity: 0;
          transition: opacity 220ms ease-out;
        }

        .operation-idle-particle-canvas {
          animation: nexus-operation-idle-pulse 8.5s ease-in-out infinite;
        }

        .operation-boot-signal {
          animation: nexus-operation-boot-signal 1040ms cubic-bezier(.2,.8,.2,1) both;
        }

        .operation-boot-line {
          animation: nexus-operation-boot-line 1040ms cubic-bezier(.2,.8,.2,1) both;
          transform-origin: left center;
        }

        .operation-event-signal {
          animation: nexus-operation-event-signal 1400ms cubic-bezier(.16,.84,.24,1) both;
        }

        .operation-materializing-signal {
          animation: nexus-operation-materializing-signal 520ms cubic-bezier(.16,.84,.24,1) both;
        }

        .operation-materializing-line {
          animation: nexus-operation-materializing-line 980ms cubic-bezier(.2,.8,.2,1) both;
          transform-origin: left center;
        }

        @media (max-width: 767px) {
          .operation-stage-mobile-panel {
            left: auto !important;
            right: auto !important;
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            transform: none !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .operation-stage-window,
          .operation-preview-line,
          .operation-scan-line,
          .operation-stage-light,
          .operation-terminal-caret,
          .operation-web-loading::after,
          .operation-diff-bar,
          .operation-phase-meter,
          .operation-focus-dot,
          .operation-stage-scene-enter,
          .operation-idle-stage-exit,
          .operation-idle-stage-exit .operation-idle-particle-canvas,
          .operation-idle-particle-canvas,
          .operation-boot-signal,
          .operation-boot-line,
          .operation-event-signal,
          .operation-materializing-signal,
          .operation-materializing-line {
            animation: none !important;
          }
        }
      `}
    </style>
  );
}
