import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Avatar,
  Divider,
  Drawer,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import SchoolIcon from "@mui/icons-material/School";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { toast } from "react-toastify";
import { logout } from "axiosInstance";
import { useProjectContext } from "Utils/Context";
import logo from "Assets/Images/logo-removebg-preview.png";

// Public navigation, shared by the desktop bar and the mobile drawer.
const NAV = [
  { to: "/resources", label: "Training" },
  { to: "/games", label: "Games" },
  { to: "/blogs", label: "Blog" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const isActive = (pathname, to) => pathname === to || pathname.startsWith(`${to}/`);

export default function AppAppBar() {
  const [open, setOpen] = React.useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = React.useState(null);
  const { user, loggedIn } = useProjectContext();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Supervision portal entry point, always visible. Supervisors and
  // supervisees go straight to their portal; everyone else (visitors and
  // customers, i.e. potential supervisors) sees the portal and its plans.
  // Access itself is decided server-side, so this is navigation, not security.
  const portalLink =
    user?.portalRole === "supervisor"
      ? { to: "/portal/supervisees", label: "Supervision portal" }
      : user?.portalRole === "supervisee"
        ? { to: "/portal", label: "My supervision" }
        : { to: "/supervision-plans", label: "Supervision portal" };
  const portalActive =
    pathname.startsWith("/portal") || pathname === "/supervision-plans";
  // View-only portals other supervisors have shared with this email.
  const sharedLink =
    user?.sharedWithMe > 0 ? { to: "/portal/shared", label: "Shared with me" } : null;

  const go = (path) => {
    setProfileMenuAnchor(null);
    setOpen(false);
    navigate(path);
  };

  const handleSignOut = async () => {
    setProfileMenuAnchor(null);
    setOpen(false);
    await logout();
    toast.success("Logged out successfully");
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  };

  const navLinkClass = (active) =>
    `rounded-lg px-3 py-2 text-[14px] font-medium no-underline transition-colors ${
      active ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <header className="fixed inset-x-0 top-0 z-[1100] px-3 pt-4 t:pt-5">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[rgba(4,37,57,0.82)] px-3 py-2 shadow-[0_10px_30px_-10px_rgba(4,37,57,0.6)] backdrop-blur-xl"
      >
        <Link to="/" className="flex items-center gap-2 no-underline" aria-label="ABA Virtual home">
          <img src={logo} alt="" width={36} height={36} className="h-9 w-9 rounded-full bg-white object-contain p-0.5" />
          <span className="font-display text-[17px] font-bold text-white">
            aba<span className="text-coral">.virtual</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 l:flex">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={navLinkClass(isActive(pathname, to))}
              aria-current={isActive(pathname, to) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
          <Link
            to={portalLink.to}
            aria-current={portalActive ? "page" : undefined}
            className={`ml-1 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-semibold no-underline transition ${
              portalActive
                ? "bg-violet-500 text-white"
                : "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/40 hover:bg-violet-500/35"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_10px_2px_rgba(167,139,250,0.8)]" aria-hidden="true" />
            {portalLink.label}
          </Link>
        </div>

        {/* Desktop account area */}
        <div className="hidden items-center gap-2 l:flex">
          {loggedIn ? (
            <>
              <IconButton
                sx={{ p: 0 }}
                aria-label="Account menu"
                aria-controls={profileMenuAnchor ? "profile-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={profileMenuAnchor ? "true" : undefined}
                onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
              >
                <Avatar src={user?.pfp} alt={user?.name || "Account"} />
              </IconButton>
              <Menu
                id="profile-menu"
                anchorEl={profileMenuAnchor}
                open={Boolean(profileMenuAnchor)}
                onClose={() => setProfileMenuAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem onClick={() => go(portalLink.to)}>
                  <ListItemIcon>
                    <SchoolIcon fontSize="small" />
                  </ListItemIcon>
                  {portalLink.label}
                </MenuItem>
                {sharedLink && (
                  <MenuItem onClick={() => go(sharedLink.to)}>
                    <ListItemIcon>
                      <VisibilityIcon fontSize="small" />
                    </ListItemIcon>
                    {sharedLink.label}
                  </MenuItem>
                )}
                <MenuItem onClick={() => go("/account")}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  My account
                </MenuItem>
                <MenuItem onClick={handleSignOut}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Sign out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Link to="/login" className={navLinkClass(pathname === "/login")}>
                Log in
              </Link>
              <Link to="/signup" className="btn-primary !min-h-0 !py-2 !px-4 !text-[14px]">
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile */}
        <div className="l:hidden">
          <IconButton aria-label="Open menu" onClick={() => setOpen(true)}>
            <MenuIcon sx={{ color: "white" }} />
          </IconButton>
          <Drawer
            anchor="top"
            open={open}
            onClose={() => setOpen(false)}
            PaperProps={{
              sx: { backgroundColor: "rgba(4, 37, 57, 0.96)", backdropFilter: "blur(24px)", color: "white" },
            }}
          >
            <div className="flex flex-col gap-1 p-4">
              <div className="flex justify-end">
                <IconButton aria-label="Close menu" onClick={() => setOpen(false)}>
                  <CloseRoundedIcon sx={{ color: "white" }} />
                </IconButton>
              </div>
              {[{ to: "/", label: "Home" }, ...NAV].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={`${navLinkClass(to === "/" ? pathname === "/" : isActive(pathname, to))} !py-3 !text-[16px]`}
                >
                  {label}
                </Link>
              ))}
              <Link
                to={portalLink.to}
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 px-4 py-3 text-[16px] font-semibold text-white no-underline"
              >
                <span className="h-2 w-2 rounded-full bg-violet-200" aria-hidden="true" />
                {portalLink.label}
              </Link>
              <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.15)" }} />
              {loggedIn ? (
                <>
                  {sharedLink && (
                    <MenuItem onClick={() => go(sharedLink.to)} sx={{ color: "white" }}>
                      <ListItemIcon>
                        <VisibilityIcon fontSize="small" sx={{ color: "white" }} />
                      </ListItemIcon>
                      {sharedLink.label}
                    </MenuItem>
                  )}
                  <MenuItem onClick={() => go("/account")} sx={{ color: "white" }}>
                    <ListItemIcon>
                      <Avatar src={user?.pfp} alt="" sx={{ width: 24, height: 24 }} />
                    </ListItemIcon>
                    My account
                  </MenuItem>
                  <MenuItem onClick={handleSignOut} sx={{ color: "white" }}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" sx={{ color: "white" }} />
                    </ListItemIcon>
                    Sign out
                  </MenuItem>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/login" onClick={() => setOpen(false)} className="btn-on-dark">
                    Log in
                  </Link>
                  <Link to="/signup" onClick={() => setOpen(false)} className="btn-primary">
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </Drawer>
        </div>
      </nav>
    </header>
  );
}
