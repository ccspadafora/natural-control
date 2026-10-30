import type { Config } from "tailwindcss"

const varColor = (token: string) => `var(--${token})`

/** Preset Tailwind → tokens CSS del Design System Natural Control. */
const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        primary: varColor("primary"),
        "primary-pressed": varColor("primary-pressed"),
        "on-primary": varColor("on-primary"),
        "primary-tint": varColor("primary-tint"),
        accent: varColor("accent"),
        "on-accent": varColor("on-accent"),
        "accent-text": varColor("accent-text"),
        "accent-tint": varColor("accent-tint"),
        canvas: varColor("canvas"),
        surface: varColor("surface"),
        "surface-raised": varColor("surface-raised"),
        "surface-sunken": varColor("surface-sunken"),
        ink: varColor("ink"),
        "ink-secondary": varColor("ink-secondary"),
        "ink-tertiary": varColor("ink-tertiary"),
        hairline: varColor("hairline"),
        "border-control": varColor("border-control"),
        success: varColor("success"),
        "success-tint": varColor("success-tint"),
        "success-solid": varColor("success-solid"),
        danger: varColor("danger"),
        "danger-tint": varColor("danger-tint"),
        "danger-solid": varColor("danger-solid"),
        warning: varColor("warning"),
        "warning-tint": varColor("warning-tint"),
        "warning-solid": varColor("warning-solid"),
        focus: varColor("focus"),
        scrim: varColor("scrim"),
        "chart-1": varColor("chart-1"),
        "chart-2": varColor("chart-2"),
        "chart-3": varColor("chart-3"),
        "chart-4": varColor("chart-4"),
        "chart-5": varColor("chart-5"),
        "brand-navy": varColor("brand-navy"),
        "brand-orange": varColor("brand-orange"),
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        12: "var(--space-12)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
      minHeight: {
        tap: "var(--tap-min)",
      },
      height: {
        "control-md": "var(--control-md)",
        "control-lg": "var(--control-lg)",
      },
      maxWidth: {
        content: "var(--content-max)",
      },
      boxShadow: {
        float: "var(--shadow-float)",
      },
    },
  },
}

export default preset
