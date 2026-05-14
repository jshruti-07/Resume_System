import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Handshake,
  Plus,
  Search,
  MoreVertical,
  Shield,
  Briefcase,
  Trash2,
  ChevronRight,
  ExternalLink,
  Building,
  Mail,
  Phone,
  BarChart3,
  Calendar,
  Users,
  ListFilter,
  ChevronDown
} from "lucide-react";
import {
  getVendors,
  createVendor,
  getJobRoles,
  assignVendorJob,
  deactivateVendor,
  getCandidates,
  deleteCandidate
} from "@/api/resumeiq";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const Vendors = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const viewParam = searchParams.get("view");

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [vendorToDelete, setVendorToDelete] = useState<any>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<any>(null);
  const [isDeleteCandidateModalOpen, setIsDeleteCandidateModalOpen] = useState(false);

  // Default to 'talent' view as requested
  const [activeView, setActiveView] = useState<"partners" | "talent">(
    viewParam === "partners" ? "partners" : "talent"
  );

  useEffect(() => {
    if (viewParam === "partners") {
      setActiveView("partners");
    } else if (viewParam === "talent" || !viewParam) {
      setActiveView("talent");
    }
  }, [viewParam]);

  // Talent Hub Filters
  const [vendorFilterId, setVendorFilterId] = useState<number | "">("");
  const [isVendorFilterOpen, setIsVendorFilterOpen] = useState(false);
  const vendorFilterRef = useRef<HTMLDivElement>(null);
  const [skillFilter, setSkillFilter] = useState("");
  const [candidatePage, setCandidatePage] = useState(1);

  // Close sorting dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vendorFilterRef.current && !vendorFilterRef.current.contains(event.target as Node)) {
        setIsVendorFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [newVendor, setNewVendor] = useState({
    name: "",
    email: "",
    company_name: "",
    password: "",
    phone: ""
  });

  const [assignment, setAssignment] = useState({
    job_role_id: 0
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: getVendors
  });

  const { data: allJobs = [] } = useQuery({
    queryKey: ["job-roles-all"],
    queryFn: () => getJobRoles()
  });

  const { data: candidatesData, isLoading: candidatesLoading } = useQuery({
    queryKey: ["candidates-hub", vendorFilterId, skillFilter || searchTerm, candidatePage],
    queryFn: () => getCandidates({
      vendor_id: vendorFilterId || undefined,
      search: (skillFilter || searchTerm) || undefined,
      page: candidatePage,
      page_size: 10,
      unassigned_only: true
    }),
    enabled: activeView === "talent"
  });

  const candidates = candidatesData?.items ?? [];
  const totalCandidates = candidatesData?.total ?? 0;
  const totalCandidatePages = Math.max(1, Math.ceil(totalCandidates / 10));

  const createMutation = useMutation({
    mutationFn: (vendor: any) => {
      // Debug logs requested
      console.log("Auth Token:", localStorage.getItem("resumeiq_token"));
      console.log("Current User Role:", user?.role);
      console.log("Payload to be sent:", vendor);
      return createVendor(vendor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor created successfully");
      setIsCreateModalOpen(false);
      setNewVendor({ name: "", email: "", company_name: "", password: "", phone: "" });
    },
    onError: (err: any) => {
      // Log full error object as requested
      console.error("Vendor creation error response:", err.response);
      
      // Surface real error in UI temporarily as requested
      toast.error(
        err.response?.data 
          ? `Error: ${JSON.stringify(err.response.data)}` 
          : "Failed to create vendor"
      );
    }
  });

  const assignMutation = useMutation({
    mutationFn: (data: any) => assignVendorJob(selectedVendor.id, { ...data, vendor_id: selectedVendor.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Job assigned to vendor");
      setIsAssignModalOpen(false);
      setAssignment({ job_role_id: 0 });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to assign job");
    }
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: (id: number) => deleteCandidate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates-hub"] });
      toast.success("Team member record removed from bench");
      setIsDeleteCandidateModalOpen(false);
      setCandidateToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to remove team member");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deactivateVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor deactivated/removed successfully");
      setIsDeleteModalOpen(false);
      setVendorToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to delete vendor");
    }
  });

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="On Bench Talent Management"
        description="Collaborate with external On Bench Talent"
        actions={
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="group relative px-6 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/25 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-none" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="relative flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span>Add New Partner</span>
            </div>
            <div className="absolute inset-0 bg-primary/40 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
          </button>
        }
      />

      {/* Tabs - Swapped so Talent Hub is first */}
      <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-xl w-fit border border-border/50">
        <button
          onClick={() => setActiveView("talent")}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeView === "talent" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Users className="w-4 h-4" /> Talent Hub
        </button>
        <button
          onClick={() => setActiveView("partners")}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeView === "partners" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Handshake className="w-4 h-4" /> Partner Management
        </button>
      </div>

      {activeView === "talent" ? (
        /* Talent Hub View (Candidates) */
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="w-full md:w-80 space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Partner Nexus</label>
              <div className="relative" ref={vendorFilterRef}>
                <button
                  onClick={() => setIsVendorFilterOpen(!isVendorFilterOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 hover:border-primary/30 hover:bg-secondary/80 transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-r border-border/50 pr-2 mr-1">Filter Partner</span>
                    <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                      {vendorFilterId ? vendors.find(v => v.id === vendorFilterId)?.name : "All Partners"}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 ${isVendorFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isVendorFilterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute left-0 mt-2 w-full min-w-[240px] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 backdrop-blur-md bg-card/95"
                    >
                      <button
                        onClick={() => {
                          setVendorFilterId("");
                          setCandidatePage(1);
                          setIsVendorFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between ${vendorFilterId === ""
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                      >
                        All On Bench Talent
                        {vendorFilterId === "" && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />}
                      </button>

                      <div className="h-px bg-border/30 my-1 mx-2" />

                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {vendors.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => {
                              setVendorFilterId(v.id);
                              setCandidatePage(1);
                              setIsVendorFilterOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between ${vendorFilterId === v.id
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                              }`}
                          >
                            {v.name}
                            {vendorFilterId === v.id && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Search On Bench:</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search name, skills, experience..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCandidatePage(1); }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="hidden md:block p-4 border-b border-border/50 bg-secondary/20">
              <div className="grid grid-cols-12 gap-x-2 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <div className="col-span-3">Team Member</div>
                <div className="col-span-1 pl-6">Experience</div>
                <div className="col-span-1" /> {/* Spacer */}
                <div className="col-span-4">Skills</div>
                <div className="col-span-2 text-center">Source</div>
                <div className="col-span-1 text-right pr-2">Action</div>
              </div>
            </div>

            <div className="divide-y divide-border/50">
              {candidatesLoading ? (
                [1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse bg-white/5" />)
              ) : candidates.length === 0 ? (
                <div className="p-20 text-center">
                  <p className="text-sm text-muted-foreground italic">No team members found on bench.</p>
                </div>
              ) : (
                candidates.map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => navigate(`/candidates/${c.id}`)}
                    className="flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-x-2 p-5 md:p-4 md:px-6 items-start md:items-center hover:bg-primary/[0.02] transition-all group cursor-pointer"
                  >
                    <div className="w-full md:col-span-3 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0 transition-transform group-hover:scale-105">
                        {c.name?.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                      </div>
                    </div>

                    <div className="w-full md:col-span-1 flex items-center pl-6">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/50 text-[10px] font-bold text-foreground border border-border/50 whitespace-nowrap">
                        {c.experience_years || 0}y
                      </div>
                    </div>

                    <div className="w-full md:col-span-1" /> {/* Spacer */}

                    <div className="w-full md:col-span-4 flex flex-wrap gap-1">
                      {(c.skills || "").split(",").slice(0, 4).map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-lg bg-primary/5 text-primary text-[9px] font-bold border border-primary/10 whitespace-nowrap">
                          {s.trim()}
                        </span>
                      ))}
                      {(c.skills || "").split(",").length > 4 && (
                        <span className="text-[9px] text-muted-foreground font-bold px-1">
                          +{(c.skills || "").split(",").length - 4}
                        </span>
                      )}
                    </div>

                    <div className="w-full md:col-span-2 flex items-center justify-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 border border-border text-[9px] font-bold text-muted-foreground truncate max-w-full">
                        <Building className="w-2.5 h-2.5" />
                        {c.source_vendor || vendors.find(v => v.id === c.uploaded_by_vendor_id)?.name || "Partner"}
                      </span>
                    </div>

                    <div className="w-full md:col-span-1 flex justify-end pr-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCandidateToDelete(c);
                          setIsDeleteCandidateModalOpen(true);
                        }}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all active:scale-90"
                        title="Delete Team Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {totalCandidatePages > 1 && (
              <div className="p-4 bg-secondary/10 border-t border-border/50 flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                  Page {candidatePage} of {totalCandidatePages}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={candidatePage === 1}
                    onClick={() => setCandidatePage(p => p - 1)}
                    className="p-2 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all font-bold text-xs"
                  >
                    Previous
                  </button>
                  <button
                    disabled={candidatePage === totalCandidatePages}
                    onClick={() => setCandidatePage(p => p + 1)}
                    className="p-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs disabled:opacity-30 transition-all shadow-md shadow-primary/20"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Partner Management View (Vendors) */
        <div className="space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search partners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="glass-card overflow-hidden">
            <div className="hidden md:block p-4 border-b border-border/50 bg-secondary/20">
              <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <div className="col-span-12 md:col-span-4">Name</div>
                <div className="md:col-span-4">Contact Information</div>
                <div className="md:col-span-2 text-center">Assignments</div>
                <div className="md:col-span-2 text-right">Action</div>
              </div>
            </div>

            <div className="divide-y divide-border/50">
              {vendorsLoading ? (
                [1, 2, 3, 4].map(i => <div key={i} className="h-20 animate-pulse bg-white/5" />)
              ) : filteredVendors.length === 0 ? (
                <div className="p-20 text-center">
                  <Handshake className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No partner vendors found.</p>
                </div>
              ) : (
                filteredVendors.map((vendor) => (
                  <motion.div
                    layout
                    key={vendor.id}
                    onClick={() => navigate(`/candidates?vendor_id=${vendor.id}&unassigned_only=true`)}
                    className="flex flex-col md:grid md:grid-cols-12 gap-4 p-5 md:p-4 md:px-8 items-start md:items-center hover:bg-primary/[0.02] transition-all group cursor-pointer"
                  >
                    <div className="w-full md:col-span-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-105">
                        <Handshake className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {vendor.name}
                          </p>
                          <span className={`w-1.5 h-1.5 rounded-full ${vendor.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:col-span-4 space-y-1 py-2 md:py-0">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
                        <Mail className="w-3.5 h-3.5 opacity-50" /> {vendor.email}
                      </div>
                      {vendor.phone && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 opacity-50" /> {vendor.phone}
                        </div>
                      )}
                    </div>

                    <div className="w-full md:col-span-2 flex justify-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedVendor(vendor); setIsAssignModalOpen(true); }}
                        className="w-full md:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Briefcase className="w-3.5 h-3.5" /> Assign Job
                      </button>
                    </div>

                    <div className="w-full md:col-span-2 flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); setVendorToDelete(vendor); setIsDeleteModalOpen(true); }}
                        className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all"
                        title="Remove On Bench Talent"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Vendor Modal */}
      <Modal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Add New Partner">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(newVendor); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text mb-2 block">Contact Name</label>
              <input
                required
                value={newVendor.name}
                onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="label-text mb-2 block">Organization Name</label>
              <input
                required
                value={newVendor.company_name}
                onChange={(e) => setNewVendor({ ...newVendor, company_name: e.target.value })}
                placeholder="Global Talent Solutions"
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div>
            <label className="label-text mb-2 block">Email Address (Login Username)</label>
            <input
              required
              type="email"
              value={newVendor.email}
              onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
              placeholder="john@globaltalent.com"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="label-text mb-2 block">Initial Password</label>
            <input
              required
              type="password"
              value={newVendor.password}
              onChange={(e) => setNewVendor({ ...newVendor, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="label-text mb-2 block">Phone Number</label>
            <input
              value={newVendor.phone}
              onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1 py-3 bg-secondary rounded-lg text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-3 bg-primary rounded-lg text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? "Creating..." : "Create Partner"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Job Modal */}
      <Modal open={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title={`Assign Job to ${selectedVendor?.name}`}>
        <form onSubmit={(e) => { e.preventDefault(); assignMutation.mutate(assignment); }} className="space-y-6">
          <div>
            <label className="label-text mb-2 block font-bold uppercase tracking-widest text-[10px]">Select Job Role</label>
            <select
              required
              value={assignment.job_role_id}
              onChange={(e) => setAssignment({ ...assignment, job_role_id: parseInt(e.target.value) })}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              <option value="0">Choose an open position...</option>
              {allJobs.filter(j => j.status === 'open').map(job => (
                <option key={job.id} value={job.id}>{job.title} ({job.location || 'Remote'})</option>
              ))}
            </select>
          </div>
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="flex-1 py-3 bg-secondary rounded-lg text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assignMutation.isPending || assignment.job_role_id === 0}
              className="flex-1 py-3 bg-primary rounded-lg text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              {assignMutation.isPending ? "Assigning..." : "Confirm Assignment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Candidate Delete Confirmation Modal */}
      <Modal open={isDeleteCandidateModalOpen} onClose={() => setIsDeleteCandidateModalOpen(false)} title="Remove Team Member from Bench">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">Delete team member record?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to delete <strong>{candidateToDelete?.name}</strong>?
                This will permanently remove their profile and all associated data from the Talent Hub.
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsDeleteCandidateModalOpen(false)}
              className="flex-1 py-3 bg-secondary rounded-lg text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteCandidateMutation.mutate(candidateToDelete.id)}
              disabled={deleteCandidateMutation.isPending}
              className="flex-1 py-3 bg-destructive rounded-lg text-destructive-foreground text-sm font-bold hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2"
            >
              {deleteCandidateMutation.isPending ? "Removing..." : "Confirm Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Permanently Remove Partner">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">Are you sure you want to permanently delete this record?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You are about to delete <strong>{vendorToDelete?.name}</strong>.
                This action is <strong>irreversible</strong> and will remove their record and login access from the system.
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 py-3 bg-secondary rounded-lg text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate(vendorToDelete.id)}
              disabled={deleteMutation.isPending}
              className="flex-1 py-3 bg-destructive rounded-lg text-destructive-foreground text-sm font-bold hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2"
            >
              {deleteMutation.isPending ? "Deleting..." : "Yes, Delete Permanently"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Vendors;
