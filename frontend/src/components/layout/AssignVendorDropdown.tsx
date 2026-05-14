import { useState, useMemo } from "react";
import { Search, UserPlus, X, Check, Users, BriefcaseBusiness, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getVendors, assignVendorsToJobs, Vendor } from "@/api/resumeiq";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface AssignVendorDropdownProps {
  selectedRoleIds: number[];
  onSuccess: () => void;
  disabled?: boolean;
}

export const AssignVendorDropdown = ({ selectedRoleIds, onSuccess, disabled }: AssignVendorDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: getVendors,
  });

  const activeVendors = useMemo(() => vendors.filter(v => v.is_active), [vendors]);

  const filteredVendors = useMemo(() => {
    return activeVendors.filter(v => 
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeVendors, searchQuery]);

  const mutation = useMutation({
    mutationFn: assignVendorsToJobs,
    onSuccess: () => {
      toast.success(`Successfully assigned ${selectedRoleIds.length} roles to ${selectedVendorIds.length} vendors`);
      queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      setSelectedVendorIds([]);
      setIsOpen(false);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to assign vendors");
    }
  });

  const toggleVendor = (id: number) => {
    setSelectedVendorIds(prev => 
      prev.includes(id) ? prev.filter(vId => vId !== id) : [...prev, id]
    );
  };

  const handleAssign = () => {
    if (selectedVendorIds.length === 0) {
      toast.error("Please select at least one vendor");
      return;
    }
    mutation.mutate({
      vendorIds: selectedVendorIds,
      roleIds: selectedRoleIds
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || selectedRoleIds.length === 0}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm
          ${selectedRoleIds.length > 0 
            ? "bg-violet-600 text-white hover:bg-violet-700 shadow-violet-500/10 active:scale-[0.98]" 
            : "bg-secondary text-muted-foreground opacity-50 cursor-not-allowed border border-border"
          }`}
      >
        <BriefcaseBusiness className="w-4 h-4" />
        <span>Assign to Vendor</span>
        {selectedRoleIds.length > 0 && (
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-bold ml-1">
            {selectedRoleIds.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-full mt-2 w-72 z-50 glass-card p-0 shadow-2xl border border-border/50 overflow-hidden"
            >
              <div className="p-3 border-b border-border/50 bg-secondary/30">
                <div className="relative group">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Search vendors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-card border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                {filteredVendors.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
                    <p className="text-[11px] text-muted-foreground">No vendors found</p>
                  </div>
                ) : (
                  filteredVendors.map((vendor) => {
                    const isSelected = selectedVendorIds.includes(vendor.id);
                    return (
                      <div
                        key={vendor.id}
                        onClick={() => toggleVendor(vendor.id)}
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-lg cursor-pointer transition-all mb-0.5
                          ${isSelected 
                            ? "bg-violet-50 text-violet-700" 
                            : "hover:bg-secondary text-foreground"
                          }`}
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold truncate leading-none mb-1">{vendor.name}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{vendor.email}</p>
                        </div>
                        <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center shrink-0
                          ${isSelected 
                            ? "bg-violet-600 border-violet-600" 
                            : "bg-card border-border"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 border-t border-border/50 bg-secondary/10 flex items-center justify-between gap-2">
                <div className="text-[10px] font-bold text-muted-foreground">
                  {selectedVendorIds.length} selected
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssign}
                    disabled={selectedVendorIds.length === 0 || mutation.isPending}
                    className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 shadow-md shadow-violet-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {mutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <UserPlus className="w-3 h-3" />
                    )}
                    Assign
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
