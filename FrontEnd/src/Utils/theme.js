import { createTheme } from "@mui/material/styles";

// One theme for every MUI screen (portal, login, account, checkout), so they
// share the public site's fonts and brand colours instead of MUI's default
// blue and Roboto (which was never loaded, so it fell back to Arial).
const heading = { fontFamily: '"Raleway", "Inter", sans-serif', fontWeight: 700 };

const theme = createTheme({
  palette: {
    primary: { main: "#265c7e", dark: "#1e4e6a", light: "#45B4B3", contrastText: "#fff" },
    secondary: { main: "#f97544", contrastText: "#fff" },
    success: { main: "#16a34a" },
    text: { primary: "#1f2937", secondary: "#5b6b7a" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", -apple-system, "Segoe UI", sans-serif',
    h1: heading,
    h2: heading,
    h3: heading,
    h4: heading,
    h5: heading,
    h6: { ...heading, fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: { root: { borderRadius: 10, boxShadow: "none" } },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16, boxShadow: "0 1px 2px rgba(4,37,57,0.06), 0 8px 24px -6px rgba(4,37,57,0.12)" },
      },
    },
  },
});

export default theme;
