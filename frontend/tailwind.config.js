/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#F9F8F6",
        white: "#FFFFFF",
        ground: "#F1EFEA",
        rule: "#E3DFD7",
        "rule-hi": "#C9C4B9",
        ink: "#141210",
        "ink-2": "#3E3C38",
        "ink-3": "#8D8A81",
        "ink-4": "#BBB8B1",
        signal: "#1A56DB",
        "signal-light": "#EFF4FF",
        success: "#166534",
        "success-light": "#F0FDF4",
        warning: "#92400E",
        "warning-light": "#FFFBEB",
        danger: "#991B1B",
        "danger-light": "#FEF2F2",
      },
      fontFamily: {
        body: ["Inter", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
