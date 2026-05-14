import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/ui/Modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompanies, createJobRole } from "@/api/resumeiq";
import { toast } from "sonner";
import { Briefcase, Building2, MapPin, Users, IndianRupee, Clock, CheckCircle2 } from "lucide-react";

const formSchema = z.object({
  company_id: z.string().min(1, "Please select a company"),
  title: z.string().min(1, "Job title is required"),
  skills: z.string().min(1, "Required skills are needed"),
  experience_required: z.string().optional(),
  work_mode: z.string().min(1, "Work mode is required"),
  location: z.string().min(1, "Location is required"),
  positions_required: z.string().min(1, "Number of openings is required"),
  estimated_budget: z.string().optional(),
  description: z.string().min(10, "Job description should be at least 10 characters"),
  status: z.string().default("open"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddOpenPositionModalProps {
  open: boolean;
  onClose: () => void;
}

export const AddOpenPositionModal = ({ open, onClose }: AddOpenPositionModalProps) => {
  const queryClient = useQueryClient();
  
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: getCompanies,
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "open",
      work_mode: "onsite",
    }
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        company_id: parseInt(values.company_id),
        title: values.title,
        description: `Skills: ${values.skills}\n\nDescription: ${values.description}`,
        status: values.status,
        experience_required: values.experience_required ? parseInt(values.experience_required) : null,
        work_mode: values.work_mode,
        location: values.location,
        positions_required: parseInt(values.positions_required),
        estimated_budget: values.estimated_budget ? parseInt(values.estimated_budget) : null,
        currency: "INR", // Default to INR as per Altzor context
      };
      return createJobRole(payload);
    },
    onSuccess: () => {
      toast.success("Job role created successfully");
      queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create job role");
    }
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New Open Position">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-3 h-3" /> Company Name
            </label>
            <select
              {...register("company_id")}
              className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
            >
              <option value="">Select Company</option>
              {companies.map(c => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
            {errors.company_id && <p className="text-[10px] text-destructive font-bold">{errors.company_id.message}</p>}
          </div>

          {/* Job Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Briefcase className="w-3 h-3" /> Job Title
            </label>
            <input
              {...register("title")}
              placeholder="e.g. Senior Software Engineer"
              className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
            />
            {errors.title && <p className="text-[10px] text-destructive font-bold">{errors.title.message}</p>}
          </div>

          {/* Skills */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3" /> Skills Required
            </label>
            <input
              {...register("skills")}
              placeholder="e.g. React, TypeScript, Node.js"
              className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
            />
            {errors.skills && <p className="text-[10px] text-destructive font-bold">{errors.skills.message}</p>}
          </div>

          {/* Experience */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-3 h-3" /> Experience (Years)
            </label>
            <input
              {...register("experience_required")}
              type="number"
              placeholder="e.g. 5"
              className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
            />
          </div>

          {/* Employment Type / Work Mode */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-3 h-3" /> Employment Type
            </label>
            <select
              {...register("work_mode")}
              className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
            >
              <option value="onsite">On-site</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Location
            </label>
            <input
              {...register("location")}
              placeholder="e.g. Bangalore, India"
              className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
            />
            {errors.location && <p className="text-[10px] text-destructive font-bold">{errors.location.message}</p>}
          </div>

          {/* Openings */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Users className="w-3 h-3" /> Number of Openings
            </label>
            <input
              {...register("positions_required")}
              type="number"
              placeholder="e.g. 2"
              className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
            />
            {errors.positions_required && <p className="text-[10px] text-destructive font-bold">{errors.positions_required.message}</p>}
          </div>

          {/* Salary Range / Budget */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <IndianRupee className="w-3 h-3" /> Salary Range / Budget (Annual)
            </label>
            <input
              {...register("estimated_budget")}
              type="number"
              placeholder="e.g. 1500000"
              className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3" /> Status
            </label>
            <select
              {...register("status")}
              className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>

          {/* Job Description */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Briefcase className="w-3 h-3" /> Job Description
            </label>
            <textarea
              {...register("description")}
              rows={4}
              placeholder="Enter detailed job description..."
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm resize-none"
            />
            {errors.description && <p className="text-[10px] text-destructive font-bold">{errors.description.message}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-border/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-bold text-[11px] uppercase tracking-widest hover:bg-secondary/80 transition-all border border-border"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-[2] py-3 rounded-xl bg-primary text-primary-foreground font-black text-[11px] uppercase tracking-[0.2em] hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              "Create Position"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
