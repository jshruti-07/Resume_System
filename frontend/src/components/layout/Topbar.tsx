import { useState } from "react";
import { Bell, ChevronRight, UserMinus, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const routeLabels: Record<string, string> = {
  "companies": "Companies",
  "job-roles": "Job Role",
  "candidates": "Candidate",
  "open-positions": "Open Positions",
  "selected": "Selected",
  "replacements": "Replacements",
  "upload": "Upload",
  "jobs": "Jobs",
  "pipeline": "Pipeline",
};

export const Topbar = ({
  onMenuClick,
  isVendor = false,
  user: userOverride,
  logout: logoutOverride
}: {
  onMenuClick: () => void,
  isVendor?: boolean,
  user?: { name: string, email: string } | null,
  logout?: () => void
}) => {
  const location = useLocation();
  const hrAuth = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const currentUser = userOverride !== undefined ? userOverride : hrAuth.user;
  const currentLogout = logoutOverride !== undefined ? logoutOverride : hrAuth.logout;

  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split("/").filter((x) => x);

    // Default breadcrumb starting point
    const breadcrumbs = [{
      label: isVendor ? "Vendor" : "Altzor",
      path: isVendor ? "/vendor" : "/",
      isLast: isVendor ? pathnames.length === 1 : pathnames.length === 0
    }];

    // If vendor, the first part is "vendor", so we skip it for deeper labels
    const startIndex = isVendor ? 1 : 0;

    pathnames.slice(startIndex).forEach((name, index) => {
      const path = `/${pathnames.slice(0, index + startIndex + 1).join("/")}`;
      const label = routeLabels[name] || (isNaN(Number(name)) ? name.charAt(0).toUpperCase() + name.slice(1) : null);

      if (label) {
        breadcrumbs.push({
          label,
          path,
          isLast: (index + startIndex) === pathnames.length - 1
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <header className="h-16 border-b border-border surface-1 flex items-center justify-between px-4 md:px-6 shrink-0 relative z-50">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm overflow-hidden whitespace-nowrap">
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.path} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />}
              {crumb.isLast ? (
                <span className="text-foreground font-semibold truncate max-w-[100px] md:max-w-none">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="text-muted-foreground hover:text-primary transition-colors truncate max-w-[80px] md:max-w-none"
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer overflow-hidden ring-1 ring-border"
          >
            {currentUser?.name?.charAt(0).toUpperCase() || "U"}
          </button>

          <AnimatePresence>
            {showProfile && (
              <>
                {/* Backdrop to close */}
                <div
                  className="fixed inset-0 z-[60]"
                  onClick={() => setShowProfile(false)}
                />

                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 mt-3 w-64 glass-card border border-border/50 shadow-2xl p-4 z-[70] overflow-hidden"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-lg font-bold">
                      {currentUser?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{currentUser?.name || "User"}</p>
                      <p className="text-[10px] text-muted-foreground truncate font-medium">{currentUser?.email}</p>
                    </div>
                  </div>

                  <div className="h-px bg-border/50 mb-4" />

                  <button
                    onClick={() => { setShowProfile(false); currentLogout && currentLogout(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 transition-all font-bold text-xs group"
                  >
                    <UserMinus className="w-4 h-4 transition-transform group-hover:scale-110" />
                    Sign Out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
