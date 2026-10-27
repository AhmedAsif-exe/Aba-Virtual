import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useLocation, useNavigate } from "react-router-dom";

import Divider from "@mui/material/Divider";
import FormLabel from "@mui/material/FormLabel";
import FormControl from "@mui/material/FormControl";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import MuiCard from "@mui/material/Card";
import { styled } from "@mui/material/styles";
import { Google } from "@mui/icons-material";
import api from "../../axiosInstance";
import { toast } from "react-toastify";
import Alert from "@mui/material/Alert";
import { BenefitList } from "Pages/Home/AccountBenefits";

// Where a visitor was heading when they were asked to log in, in words.
const destinationLabel = (from) => {
  if (!from) return null;
  if (from === "/supervision-plans") return "choose a supervision portal plan";
  if (from.startsWith("/portal")) return "open the supervision portal";
  if (from === "/account") return "open your account";
  if (from.startsWith("/resources")) return "continue with that resource";
  return "continue";
};

// Same-site paths only: "//host" or "/\host" would be an open redirect.
const isSafePath = (p) =>
  typeof p === "string" && p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/\\");

// Where to land after logging in: the page they were heading to, else their
// own portal home, else the home page. Mirrors landingPath in Routes/auth.js.
const landingPath = (user, from) => {
  if (isSafePath(from)) return from;
  if (user?.portalRole === "supervisor") return "/portal/supervisees";
  if (user?.portalRole === "supervisee") return "/portal";
  return "/";
};
const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignSelf: "center",
  width: "100%",
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: "auto",
  [theme.breakpoints.up("sm")]: {
    maxWidth: "450px",
  },
  boxShadow:
    "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
  ...theme.applyStyles("dark", {
    boxShadow:
      "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
  }),
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
  //   height: "calc((1 - var(--template-frame-height, 0)) * 100dvh)",
  marginTop: "100px",
  minHeight: "100%",
  padding: theme.spacing(2),
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(4),
  },

  "&::before": {
    content: '""',
    display: "block",
    position: "absolute",
    zIndex: -1,
    inset: 0,
    backgroundImage:
      "radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
    backgroundRepeat: "no-repeat",
    ...theme.applyStyles("dark", {
      backgroundImage:
        "radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))",
    }),
  },
}));

export default function Login(props) {
  const location = useLocation();

  const isLogin = location.pathname === "/login" ? true : false;

  const [emailError, setEmailError] = React.useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = React.useState("");
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState("");
  const [nameError, setNameError] = React.useState(false);
  const [nameErrorMessage, setNameErrorMessage] = React.useState("");

  const navigate = useNavigate();

  const validateInputs = () => {
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const name = document.getElementById("name");

    let isValid = true;

    if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
      setEmailError(true);
      setEmailErrorMessage("Please enter a valid email address.");
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage("");
    }

    if (!password.value || password.value.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage("Password must be at least 6 characters long.");
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage("");
    }

    if (!isLogin && (!name.value || name.value.length < 2)) {
      setNameError(true);
      setNameErrorMessage("Name must be at least 2 characters long.");
      isValid = false;
    } else {
      setNameError(false);
      setNameErrorMessage("");
    }

    return isValid;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateInputs()) {
      return;
    }

    const data = new FormData(event.currentTarget);
    const formData = {
      email: data.get("email"),
      password: data.get("password"),
      ...(isLogin ? {} : { name: data.get("name") }),
    };

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const res = await api.post(endpoint, formData);
      window.scrollTo(0, 0);
      window.location.href = landingPath(res.data?.user, location.state?.from);
      toast.success(isLogin ? "Login successful!" : "Registration successful!");
    } catch (error) {
      const message = error.response?.data?.message || "An error occurred";
      toast.error(message);
    }
  };

  const handleGoogleLogin = () => {
    const from = location.state?.from;
    const query = isSafePath(from) ? `?from=${encodeURIComponent(from)}` : "";
    window.location.href = `${process.env.REACT_APP_BACKEND_URI}auth/google${query}`;
  };

  const from = location.state?.from;
  const goingTo = destinationLabel(from);

  const card = (
      <Card variant="outlined">
        <Typography
          component="h1"
          variant="h4"
          sx={{ width: "100%", fontSize: "clamp(1.8rem, 8vw, 2.1rem)" }}
        >
          {isLogin ? "Log in" : "Create your account"}
        </Typography>
        {goingTo && (
          <Alert severity="info" sx={{ textAlign: "left" }}>
            Please {isLogin ? "log in" : "create an account or log in"} to {goingTo}.
          </Alert>
        )}
        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            gap: 2,
          }}
        >
          {!isLogin && (
            <FormControl>
              <FormLabel htmlFor="name">Name</FormLabel>
              <TextField
                error={nameError}
                helperText={nameErrorMessage}
                id="name"
                type="text"
                name="name"
                placeholder="Your Name"
                autoComplete="name"
                required
                fullWidth
                variant="outlined"
                color={nameError ? "error" : "primary"}
              />
            </FormControl>
          )}
          <FormControl>
            <FormLabel htmlFor="email">Email</FormLabel>
            <TextField
              error={emailError}
              helperText={emailErrorMessage}
              id="email"
              type="email"
              name="email"
              placeholder="your@email.com"
              autoComplete="email"
              autoFocus
              required
              fullWidth
              variant="outlined"
              color={emailError ? "error" : "primary"}
            />
          </FormControl>
          <FormControl>
            <FormLabel htmlFor="password">Password</FormLabel>
            <TextField
              error={passwordError}
              helperText={passwordErrorMessage}
              name="password"
              placeholder="••••••"
              type="password"
              id="password"
              autoComplete="current-password"
              required
              fullWidth
              variant="outlined"
              color={passwordError ? "error" : "primary"}
            />
          </FormControl>

          {/* {isLogin && (
            <Link
              component="button"
              type="button"
              onClick={handleClickOpen}
              variant="body2"
              sx={{ alignSelf: "center" }}
            >
              Forgot your password?
            </Link>
          )} */}
          <Button type="submit" fullWidth variant="contained" size="large">
            {isLogin ? "Log in" : "Create account"}
          </Button>
        </Box>
        <Divider>or</Divider>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            onClick={handleGoogleLogin}
            startIcon={<Google />}
            sx={{ borderColor: "#d0d7de", color: "#1f2937" }}
          >
            Continue with Google
          </Button>

          <Typography sx={{ textAlign: "center" }}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <Link
              component="button"
              variant="body2"
              sx={{ alignSelf: "center", ml: 1 }}
              // Keep where they were heading when switching forms.
              onClick={() => navigate(isLogin ? "/signup" : "/login", { state: location.state })}
            >
              {isLogin ? "Sign up" : "Log in"}
            </Link>
          </Typography>
        </Box>
      </Card>
  );

  return (
    <SignInContainer direction="column" justifyContent="center">
      {isLogin ? (
        card
      ) : (
        <div className="mx-auto grid w-full max-w-[980px] items-stretch gap-6 t:grid-cols-[1fr_450px]">
          <aside className="relative overflow-hidden rounded-2xl bg-navy p-8 text-white shadow-lift">
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal/30 blur-3xl" />
            <div className="relative text-left">
              <p className="eyebrow text-teal m-0">Free account</p>
              <h2 className="mt-3 mb-6 text-[26px] font-extrabold">What you get when you join</h2>
              <BenefitList dark />
            </div>
          </aside>
          {card}
        </div>
      )}
    </SignInContainer>
  );
}
