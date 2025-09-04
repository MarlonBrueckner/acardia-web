export const themeSet = {
  dark: {
    bg: "#1f1f1f",
    text: "#fff",
    sub: "#BFC4CF",
    card: "#181818",
    border: "#2a2a2f",
    grid: "#181818",
    accent: "#2c60fa",
    good: "#1cbf73",
    bad: "#ee4e4e",
    kpiShadow: "none",
    tileGradFrom: "#2032a4",
    tileGradTo: "#e82fa6",
  },
  light: {
    bg: "#ffffffff",
    text: "#23232a",
    sub: "#495060",
    card: "#fff",
    border: "#e3e7ef",
    grid: "#0055ffff",
    accent: "#2c60fa",
    good: "#1cbf73",
    bad: "#ff4d4f",
    kpiShadow: "0 14px 24px rgba(30,36,64,.12)",
    tileGradFrom: "#2c60fa",
    tileGradTo: "#67baff",
  },
};

export const useTheme = (dark) => (dark ? themeSet.dark : themeSet.light);
