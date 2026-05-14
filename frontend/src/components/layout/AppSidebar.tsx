import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  Users,
  X,
  Handshake,
  Briefcase,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCompanies, getVendors } from "@/api/resumeiq";
import { TM } from "@/config/branding";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: TM.plural, icon: Users, path: "/candidates" },
  { label: "Companies", icon: Building2, path: "/companies" },
  { label: "On Bench Talent", icon: Handshake, path: "/vendors" },
];

export const AppSidebar = ({ onMobileClose }: { onMobileClose?: () => void }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [companiesExpanded, setCompaniesExpanded] = useState(false);
  const [vendorsExpanded, setVendorsExpanded] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const location = useLocation();

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: getCompanies,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: getVendors,
  });

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-screen flex flex-col border-r border-white/10 relative z-20 shrink-0 shadow-2xl"
      style={{ background: 'var(--sidebar-gradient)' }}
    >
      {/* ✅ Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/5 gap-3 justify-between">
        <div className={`flex items-center gap-3 flex-1 overflow-hidden transition-all duration-200 ${collapsed ? "justify-center" : "pl-8"}`}>
          <img
            src="/altzor-Logo.png"
            alt="Altzor Logo"
            className={`object-contain transition-all duration-200 ${collapsed ? "w-10" : "w-28"
              }`}
          />
        </div>
        {!collapsed && (
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isCompanies = item.label === "Companies";

          return (
            <div key={item.path} className="flex flex-col">
              <Link
                to={item.path}
                onClick={() => {
                  if (isCompanies && !collapsed) {
                    setCompaniesExpanded(!companiesExpanded);
                    setVendorsExpanded(false);
                  } else if (item.label === "On Bench Talent" && !collapsed) {
                    setVendorsExpanded(!vendorsExpanded);
                    setCompaniesExpanded(false);
                  }
                  if (!isCompanies && item.label !== "On Bench Talent" && onMobileClose) {
                    onMobileClose();
                  }
                }}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                ${isActive
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
              >
                <item.icon
                  className={`w-5 h-5 shrink-0 ${isActive
                    ? "text-white"
                    : "text-white/40 group-hover:text-white/80"
                    }`}
                />

                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex-1 flex items-center justify-between overflow-hidden"
                    >
                      <span className="whitespace-nowrap">{item.label}</span>
                      {((isCompanies && companies.length > 0) || (item.label === "On Bench Talent" && vendors.length > 0)) && (
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${(isCompanies && companiesExpanded) || (item.label === "On Bench Talent" && vendorsExpanded)
                            ? "rotate-180" : ""
                            }`}
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 w-0.5 h-6 bg-white rounded-r shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    transition={{ duration: 0.2 }}
                  />
                )}
              </Link>

              {/* Company Submenu */}
              <AnimatePresence>
                {isCompanies && companiesExpanded && !collapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-1 py-1 space-y-0.5 mt-1">
                      {/* Search in Dropdown */}
                      {companies.length > 3 && (
                        <div className="relative mb-2 px-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
                          <input
                            type="text"
                            placeholder="Filter companies..."
                            value={companySearch}
                            onChange={(e) => setCompanySearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-md py-1.5 pl-7 pr-2 text-[12px] text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-medium"
                          />
                        </div>
                      )}

                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-0.5">
                        {companies
                          .filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()))
                          .map((company) => {
                            const isCurrentCompany = location.pathname === "/companies" && location.search === `?id=${company.id}`;
                            return (
                              <Link
                                key={company.id}
                                to={`/companies?id=${company.id}`}
                                onClick={() => {
                                  if (onMobileClose) onMobileClose();
                                }}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition-all duration-150 group/item
                                  ${isCurrentCompany
                                    ? "text-white bg-white/10 font-semibold shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                                    : "text-white/40 hover:text-white hover:bg-white/5 font-medium"
                                  }`}
                              >
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors
                                  ${isCurrentCompany ? "bg-white/20 text-white" : "bg-white/5 text-white/40 group-hover/item:bg-white/10 group-hover/item:text-white/80"}`}>
                                  {company.name[0].toUpperCase()}
                                </div>
                                <span className="truncate flex-1">{company.name}</span>
                                {isCurrentCompany && (
                                  <motion.div
                                    layoutId="active-dot"
                                    className="w-1 h-1 bg-white rounded-full shadow-[0_0_5px_rgba(255,255,255,0.8)]"
                                  />
                                )}
                              </Link>
                            );
                          })}

                        {companies.length === 0 ? (
                          <div className="py-4 text-center">
                            <p className="text-[10px] text-white/20 italic">No companies found</p>
                          </div>
                        ) : companies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase())).length === 0 && (
                          <div className="py-2 text-center">
                            <p className="text-[10px] text-white/20">No matches</p>
                          </div>
                        )}
                      </div>

                      {/* Add Company Shortcut */}
                      <Link
                        to="/companies?action=new"
                        className="flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-[13px] text-white/40 hover:text-white hover:bg-white/5 transition-all border-t border-white/5 pt-2"
                      >
                        <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center">
                          <Plus className="w-3 h-3" />
                        </div>
                        <span className="font-medium">Add Company</span>
                      </Link>
                    </div>
                  </motion.div>
                )}

                {/* On Bench Talent Submenu */}
                {item.label === "On Bench Talent" && vendorsExpanded && !collapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-1 py-1 space-y-0.5 mt-1">
                      {/* Search in Dropdown */}
                      {vendors.length > 3 && (
                        <div className="relative mb-2 px-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
                          <input
                            type="text"
                            placeholder="Filter partners..."
                            value={vendorSearch}
                            onChange={(e) => setVendorSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-md py-1.5 pl-7 pr-2 text-[12px] text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-medium"
                          />
                        </div>
                      )}

                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-0.5">
                        {vendors
                          .filter(v => v.name.toLowerCase().includes(vendorSearch.toLowerCase()))
                          .map((vendor) => {
                            const isCurrentVendor = location.pathname === "/candidates" && location.search.includes(`vendor_id=${vendor.id}`) && location.search.includes("unassigned_only=true");
                            return (
                              <Link
                                key={vendor.id}
                                to={`/candidates?vendor_id=${vendor.id}&unassigned_only=true`}
                                onClick={() => {
                                  if (onMobileClose) onMobileClose();
                                }}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition-all duration-150 group/item
                                  ${isCurrentVendor
                                    ? "text-white bg-white/10 font-semibold shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                                    : "text-white/40 hover:text-white hover:bg-white/5 font-medium"
                                  }`}
                              >
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors
                                  ${isCurrentVendor ? "bg-white/20 text-white" : "bg-white/5 text-white/40 group-hover/item:bg-white/10 group-hover/item:text-white/80"}`}>
                                  {vendor.name[0].toUpperCase()}
                                </div>
                                <span className="truncate flex-1">{vendor.name}</span>
                                {isCurrentVendor && (
                                  <motion.div
                                    layoutId="active-vendor-dot"
                                    className="w-1 h-1 bg-white rounded-full shadow-[0_0_5px_rgba(255,255,255,0.8)]"
                                  />
                                )}
                              </Link>
                            );
                          })}

                        {vendors.length === 0 ? (
                          <div className="py-4 text-center">
                            <p className="text-[10px] text-white/20 italic">No partners found</p>
                          </div>
                        ) : vendors.filter(v => v.name.toLowerCase().includes(vendorSearch.toLowerCase())).length === 0 && (
                          <div className="py-2 text-center">
                            <p className="text-[10px] text-white/20">No matches</p>
                          </div>
                        )}
                      </div>

                      {/* Add Vendor Shortcut */}
                      <Link
                        to="/vendors?action=new"
                        className="flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-[13px] text-white/40 hover:text-white hover:bg-white/5 transition-all border-t border-white/5 pt-2"
                      >
                        <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center">
                          <Plus className="w-3 h-3" />
                        </div>
                        <span className="font-medium">Add On Bench Talent</span>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-12 flex items-center justify-center border-t border-white/5 text-white/40 hover:text-white hover:bg-white/5 transition-all"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </motion.aside>
  );
};
