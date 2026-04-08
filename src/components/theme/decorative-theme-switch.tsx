import { useId } from "react"
import styled from "styled-components"
import { useTheme } from "./theme-provider"

type DecorativeThemeSwitchProps = {
  className?: string
}

function SilverCoinIcon({ gradId }: { gradId: string }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8ecf0" />
          <stop offset="45%" stopColor="#b8c0c8" />
          <stop offset="100%" stopColor="#7a8490" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill={`url(#${gradId})`} stroke="#5c6570" strokeWidth="0.6" />
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.5" />
      <text
        x="12"
        y="13.5"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill="#4a5568"
        fontFamily="system-ui, sans-serif"
      >
        ₹
      </text>
    </svg>
  )
}

function GoldCoinIcon({ gradId }: { gradId: string }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff4c2" />
          <stop offset="40%" stopColor="#f0c040" />
          <stop offset="100%" stopColor="#c78a10" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill={`url(#${gradId})`} stroke="#a06d08" strokeWidth="0.6" />
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="#fff8dc" strokeOpacity="0.55" strokeWidth="0.5" />
      <text
        x="12"
        y="13.5"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill="#7a5200"
        fontFamily="system-ui, sans-serif"
      >
        ₹
      </text>
    </svg>
  )
}

/**
 * Day/night toggle. Checkbox checked = light mode; unchecked = dark mode.
 * Thumb uses SVG coins (replaces box-shadow-only ::before that could render as a black square).
 */
export function DecorativeThemeSwitch({ className }: DecorativeThemeSwitchProps) {
  const id = useId()
  const silverGradId = `${id.replace(/:/g, "")}-silver`
  const goldGradId = `${id.replace(/:/g, "")}-gold`
  const { setTheme, resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const checked = !isDark

  return (
    <StyledWrapper className={className}>
      <label className="switch" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => setTheme(e.target.checked ? "light" : "dark")}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        />
        <span className="slider">
          <span className="thumb">
            <span className="thumb-face thumb-face--dark">
              <SilverCoinIcon gradId={silverGradId} />
            </span>
            <span className="thumb-face thumb-face--light">
              <GoldCoinIcon gradId={goldGradId} />
            </span>
          </span>
          <span className="star star_1" />
          <span className="star star_2" />
          <span className="star star_3" />
          <svg viewBox="0 0 16 16" className="cloud_1 cloud" aria-hidden>
            <path
              transform="matrix(.77976 0 0 .78395-299.99-418.63)"
              fill="#fff"
              d="m391.84 540.91c-.421-.329-.949-.524-1.523-.524-1.351 0-2.451 1.084-2.485 2.435-1.395.526-2.388 1.88-2.388 3.466 0 1.874 1.385 3.423 3.182 3.667v.034h12.73v-.006c1.775-.104 3.182-1.584 3.182-3.395 0-1.747-1.309-3.186-2.994-3.379.007-.106.011-.214.011-.322 0-2.707-2.271-4.901-5.072-4.901-2.073 0-3.856 1.202-4.643 2.925"
            />
          </svg>
        </span>
      </label>
    </StyledWrapper>
  )
}

const StyledWrapper = styled.div`
  .switch {
    font-size: 11px;
    position: relative;
    display: inline-block;
    width: 4em;
    height: 2.2em;
    border-radius: 30px;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.12);
  }

  .switch:focus-within {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 1px;
    border-radius: 30px;
  }

  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
    margin: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #2a2a2a;
    transition: 0.4s;
    border-radius: 30px;
    overflow: hidden;
  }

  .thumb {
    position: absolute;
    z-index: 2;
    height: 1.2em;
    width: 1.2em;
    left: 0.5em;
    bottom: 0.5em;
    transition: transform 0.4s;
    transition-timing-function: cubic-bezier(0.81, -0.04, 0.38, 1.5);
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
  }

  .thumb-face {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .thumb-face--light {
    opacity: 0;
  }

  .switch input:checked + .slider .thumb {
    transform: translateX(1.8em);
  }

  .switch input:checked + .slider .thumb-face--dark {
    opacity: 0;
  }

  .switch input:checked + .slider .thumb-face--light {
    opacity: 1;
  }

  .switch input:checked + .slider {
    background-color: #00a6ff;
  }

  .star {
    background-color: #fff;
    border-radius: 50%;
    position: absolute;
    width: 3px;
    transition: all 0.4s;
    height: 3px;
  }

  .star_1 {
    left: 2.5em;
    top: 0.5em;
  }

  .star_2 {
    left: 2.2em;
    top: 1.2em;
  }

  .star_3 {
    left: 3em;
    top: 0.9em;
  }

  .switch input:checked ~ .slider .star {
    opacity: 0;
  }

  .cloud {
    width: 3.5em;
    position: absolute;
    bottom: -1.4em;
    left: -1.1em;
    opacity: 0;
    transition: all 0.4s;
  }

  .switch input:checked ~ .slider .cloud {
    opacity: 1;
  }
`
