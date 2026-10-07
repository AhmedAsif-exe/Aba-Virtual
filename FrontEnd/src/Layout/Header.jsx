import * as React from "react";
import { styled } from "@mui/material/styles";
import {
  Box,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Container,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  Drawer,
  Typography,
  Avatar,
  Badge,
} from "@mui/material";
import { logout } from "axiosInstance";
import { toast } from "react-toastify";
import { useProjectContext } from "Utils/Context";
import logo from "Assets/Images/logo-removebg-preview.png";
import MenuIcon from "@mui/icons-material/Menu";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import SchoolIcon from "@mui/icons-material/School";
import { useNavigate } from "react-router-dom";
const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: 0,
  borderRadius: `calc(${theme.shape.borderRadius}px + 8px)`,
  backdropFilter: "blur(24px)",
  border: "1px solid",
  borderColor: (theme.vars || theme).palette.divider,
  //   backgroundColor: theme.vars
  //     ? `rgba(${theme.vars.palette.background.defaultChannel} / 0.4)`
  //     : alpha(theme.palette.background.default, 0.4),
  backgroundColor: "rgba(4, 37, 57, 0.8)",
  boxShadow: (theme.vars || theme).shadows[1],
  padding: "8px 12px",
}));

export default function AppAppBar() {
  const [open, setOpen] = React.useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = React.useState(null);
  const { user, loggedIn, loading, cart } = useProjectContext();

  // Supervision portal entry point. Shown only to accounts that have a
  // portalRole; everyone else never sees the link. Access itself is decided
  // server-side, so this is navigation, not security.
  const portalLink =
    user?.portalRole === "supervisor"
      ? { to: "/portal/supervisees", label: "Supervision" }
      : user?.portalRole === "supervisee"
        ? { to: "/portal", label: "My supervision" }
        : null;
  const toggleDrawer = (newOpen) => () => {
    setOpen(newOpen);
  };

  const navigate = useNavigate();
  const handleNavigation = (path) => {
    navigate(path);
    setOpen(false);
  };

  const handleSignOut = async () => {
    setProfileMenuAnchor(null);
    setOpen(false);
    await logout();
    toast.success("Logged Out Successfully");
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  };
  return (
    <AppBar
      position="fixed"
      enableColorOnDark
      sx={{
        boxShadow: 0,
        bgcolor: "transparent",
        backgroundImage: "none",
        mt: "calc(var(--template-frame-height, 0px) + 28px)",
      }}
    >
      <Container maxWidth="lg">
        <StyledToolbar variant="dense" disableGutters>
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              alignItems: "center",
              px: 0,
              justifyContent: "space-between",
            }}
          >
            <Box
              display={"flex"}
              alignItems={"center"}
              flexDirection={"row"}
              justifyContent={"space-between"}
              onClick={navigate.bind(this, "/")}
            >
              <Avatar src={logo} />
              <Typography px={"10px"} fontWeight="bold" color="#FFFFFF">
                aba
                <Box component="span" sx={{ color: "#f97544" }}>
                  .virtual
                </Box>
              </Typography>
            </Box>

            <Box sx={{ display: { xs: "none", md: "flex" } }}>
              <a href="/" style={{ textDecoration: "none" }}>
                <Button
                  variant="text"
                  color="info"
                  size="small"
                  sx={{ minWidth: 0, color: "#ffffff", mx: 1 }}
                >
                  Home
                </Button>
              </a>
              <a href="/about" style={{ textDecoration: "none" }}>
                <Button
                  variant="text"
                  color="info"
                  size="small"
                  sx={{ minWidth: 0, color: "#ffffff", mx: 1 }}
                >
                  About
                </Button>
              </a>
              <a href="/blogs" style={{ textDecoration: "none" }}>
                <Button
                  variant="text"
                  color="info"
                  size="small"
                  sx={{ minWidth: 0, color: "#ffffff", mx: 1 }}
                >
                  Blog
                </Button>
              </a>
              <a href="/resources" style={{ textDecoration: "none" }}>
                <Button
                  variant="text"
                  color="info"
                  size="small"
                  sx={{ minWidth: 0, color: "#ffffff", mx: 1 }}
                >
                  Resources
                </Button>
              </a>
              <a href="/games" style={{ textDecoration: "none" }}>
                <Button
                  variant="text"
                  color="info"
                  size="small"
                  onClick={navigate.bind(this, "/games")}
                  sx={{ minWidth: 0, color: "#ffffff", mx: 1 }}
                >
                  Games
                </Button>
              </a>
              <a href="/contact" style={{ textDecoration: "none" }}>
                <Button
                  variant="text"
                  size="small"
                  sx={{ minWidth: 0, color: "#ffffff", mx: 1 }}
                >
                  Contact
                </Button>
              </a>
            </Box>

            {loggedIn ? (
              <Box
                width={"140px"}
                sx={{
                  display: { xs: "none", md: "flex" },
                  gap: 1,
                  justifyContent: "flex-end",
                  alignItems: "center",
                }}
              >
                <IconButton
                  sx={{ padding: 0 }}
                  aria-controls={
                    profileMenuAnchor ? "profile-menu" : undefined
                  }
                  aria-haspopup="true"
                  aria-expanded={profileMenuAnchor ? "true" : undefined}
                  onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
                >
                  {<Avatar src={user.pfp} />}
                </IconButton>
                <Menu
                  id="profile-menu"
                  anchorEl={profileMenuAnchor}
                  open={Boolean(profileMenuAnchor)}
                  onClose={() => setProfileMenuAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  {portalLink && (
                    <MenuItem
                      onClick={() => {
                        setProfileMenuAnchor(null);
                        navigate(portalLink.to);
                      }}
                    >
                      <ListItemIcon>
                        <SchoolIcon fontSize="small" />
                      </ListItemIcon>
                      {portalLink.label}
                    </MenuItem>
                  )}
                  <MenuItem
                    onClick={() => {
                      setProfileMenuAnchor(null);
                      navigate("/account");
                    }}
                  >
                    <ListItemIcon>
                      <SettingsIcon fontSize="small" />
                    </ListItemIcon>
                    Settings
                  </MenuItem>
                  <MenuItem onClick={handleSignOut}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    Sign Out
                  </MenuItem>
                </Menu>
              </Box>
            ) : (
              <Box
                sx={{
                  display: { xs: "none", md: "flex" },
                  gap: 1,
                  alignItems: "center",
                }}
              >
                <a href="/login" style={{ textDecoration: "none" }}>
                  <Button color="#f97544" variant="text" size="small">
                    Sign in
                  </Button>
                </a>
                <a href="/signup" style={{ textDecoration: "none" }}>
                  <Button
                    sx={{ backgroundColor: "#f97544" }}
                    variant="contained"
                    size="small"
                  >
                    Sign up
                  </Button>
                </a>
              </Box>
            )}
          </Box>
          <Box sx={{ display: { xs: "flex", md: "none" }, gap: 1 }}>
            <IconButton aria-label="Menu button" onClick={toggleDrawer(true)}>
              <MenuIcon sx={{ color: "white" }} />
            </IconButton>
            <Drawer
              anchor="top"
              open={open}
              onClose={toggleDrawer(false)}
              PaperProps={{
                sx: {
                  top: "var(--template-frame-height, 0px)",
                },
              }}
            >
              <Box
                sx={{
                  p: 2,
                  backgroundColor: "rgba(4, 37, 57, 0.8)",
                  backdropFilter: "blur(24px)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <IconButton onClick={toggleDrawer(false)}>
                    <CloseRoundedIcon sx={{ color: "white" }} />
                  </IconButton>
                </Box>{" "}
                <MenuItem>
                  <a href="/" style={{ textDecoration: "none" }}>
                    <Button
                      variant="text"
                      color="info"
                      size="small"
                      sx={{ minWidth: 0, color: "#ffffff" }}
                    >
                      Home
                    </Button>
                  </a>
                </MenuItem>
                <MenuItem>
                  <a href="/about" style={{ textDecoration: "none" }}>
                    <Button
                      variant="text"
                      color="info"
                      size="small"
                      sx={{ minWidth: 0, color: "#ffffff" }}
                    >
                      About
                    </Button>
                  </a>
                </MenuItem>
                <MenuItem>
                  <a href="/blogs" style={{ textDecoration: "none" }}>
                    <Button
                      variant="text"
                      color="info"
                      size="small"
                      sx={{ minWidth: 0, color: "#ffffff" }}
                    >
                      Blog
                    </Button>
                  </a>
                </MenuItem>
                <MenuItem>
                  <a href="/resources" style={{ textDecoration: "none" }}>
                    <Button
                      variant="text"
                      color="info"
                      size="small"
                      sx={{ minWidth: 0, color: "#ffffff" }}
                    >
                      Resources
                    </Button>
                  </a>
                </MenuItem>
                <MenuItem>
                  <a href="/games" style={{ textDecoration: "none" }}>
                    <Button
                      variant="text"
                      color="info"
                      size="small"
                      sx={{ minWidth: 0, color: "#ffffff" }}
                    >
                      Games
                    </Button>
                  </a>
                </MenuItem>
                <MenuItem>
                  <a href="/contact" style={{ textDecoration: "none" }}>
                    <Button
                      variant="text"
                      size="small"
                      sx={{ minWidth: 0, color: "#ffffff" }}
                    >
                      Contact
                    </Button>
                  </a>
                </MenuItem>
                <Divider sx={{ my: 3 }} />
                {loggedIn ? (
                  <>
                    {portalLink && (
                      <MenuItem
                        onClick={() => handleNavigation(portalLink.to)}
                        sx={{ color: "white" }}
                      >
                        <ListItemIcon>
                          <SchoolIcon fontSize="small" sx={{ color: "white" }} />
                        </ListItemIcon>
                        {portalLink.label}
                      </MenuItem>
                    )}
                    <MenuItem
                      onClick={() => handleNavigation("/account")}
                      sx={{ color: "white" }}
                    >
                      <ListItemIcon>
                        <Avatar
                          src={user?.pfp}
                          sx={{ width: 24, height: 24 }}
                        />
                      </ListItemIcon>
                      Settings
                    </MenuItem>
                    <MenuItem onClick={handleSignOut} sx={{ color: "white" }}>
                      <ListItemIcon>
                        <LogoutIcon fontSize="small" sx={{ color: "white" }} />
                      </ListItemIcon>
                      Sign Out
                    </MenuItem>
                  </>
                ) : (
                  <>
                    <MenuItem>
                      <a href="/login" style={{ textDecoration: "none" }}>
                        <Button
                          color="#f97544"
                          variant="text"
                          size="small"
                          fullWidth
                          sx={{ color: "white" }}
                        >
                          Sign in
                        </Button>
                      </a>
                    </MenuItem>
                    <MenuItem>
                      <a href="/signup" style={{ textDecoration: "none" }}>
                        <Button
                          sx={{ backgroundColor: "#f97544" }}
                          variant="contained"
                          size="small"
                          fullWidth
                        >
                          Sign up
                        </Button>
                      </a>
                    </MenuItem>
                  </>
                )}
              </Box>
            </Drawer>
          </Box>
        </StyledToolbar>
      </Container>
    </AppBar>
  );
}
