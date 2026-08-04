"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { z } from "zod";
import { mockScoreCreateSchema } from "@/lib/validation/schemas";
import { useToast } from "@/components/ui/toaster";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type MockScoreCreateInput = z.infer<typeof mockScoreCreateSchema>;

interface MockScoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MockScoreModal({ open, onOpenChange }: MockScoreModalProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MockScoreCreateInput>({
    resolver: zodResolver(mockScoreCreateSchema),
    defaultValues: {
      mockDate: new Date().toISOString().split("T")[0],
      mockName: "SimCAT ",
      totalScore: 0,
      overallPercentile: 0,
      varcScore: 0,
      varcPercentile: 0,
      dilrScore: 0,
      dilrPercentile: 0,
      qaScore: 0,
      qaPercentile: 0,
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: MockScoreCreateInput) => {
      const res = await fetch("/api/mocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Failed to log mock score");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mocks"] });
      toast({ title: "Mock score logged successfully!", tone: "success" });
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: err.message, tone: "error" });
    },
  });

  const onSubmit = (data: MockScoreCreateInput) => {
    mutation.mutate(data);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-[12px] shadow-[var(--shadow-2)] p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto z-50 space-y-4">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold text-[var(--color-ink)]">
              Log Mock Score
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-1 text-[var(--color-ink-muted)] hover:bg-black/5">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink-secondary)] mb-1">
                  Mock Name
                </label>
                <input
                  type="text"
                  {...register("mockName")}
                  className="w-full bg-white border border-[#dddddd] rounded-[4px] px-3 py-1.5 focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {errors.mockName && (
                  <p className="text-[12px] text-[var(--color-danger)] mt-0.5">
                    {errors.mockName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink-secondary)] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  {...register("mockDate")}
                  className="w-full bg-white border border-[#dddddd] rounded-[4px] px-3 py-1.5 focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {errors.mockDate && (
                  <p className="text-[12px] text-[var(--color-danger)] mt-0.5">
                    {errors.mockDate.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-[var(--color-canvas-soft)] p-3 rounded-[8px]">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
                  Total Score (0–300)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register("totalScore", { valueAsNumber: true })}
                  className="w-full bg-white border border-[#dddddd] rounded-[4px] px-3 py-1.5"
                />
                {errors.totalScore && (
                  <p className="text-[12px] text-[var(--color-danger)] mt-0.5">
                    {errors.totalScore.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
                  Overall Percentile (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("overallPercentile", { valueAsNumber: true })}
                  className="w-full bg-white border border-[#dddddd] rounded-[4px] px-3 py-1.5"
                />
                {errors.overallPercentile && (
                  <p className="text-[12px] text-[var(--color-danger)] mt-0.5">
                    {errors.overallPercentile.message}
                  </p>
                )}
              </div>
            </div>

            {/* Section Breakdown */}
            <div className="space-y-3">
              <h4 className="font-semibold text-xs text-[var(--color-ink-muted)] uppercase tracking-wider">
                Sectional Breakdown
              </h4>

              {/* VARC */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-ink-secondary)]">VARC Score</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register("varcScore", { valueAsNumber: true })}
                    className="w-full border rounded-[4px] px-2.5 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-ink-secondary)]">VARC Percentile</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("varcPercentile", { valueAsNumber: true })}
                    className="w-full border rounded-[4px] px-2.5 py-1 text-xs"
                  />
                </div>
              </div>

              {/* DILR */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-ink-secondary)]">DILR Score</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register("dilrScore", { valueAsNumber: true })}
                    className="w-full border rounded-[4px] px-2.5 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-ink-secondary)]">DILR Percentile</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("dilrPercentile", { valueAsNumber: true })}
                    className="w-full border rounded-[4px] px-2.5 py-1 text-xs"
                  />
                </div>
              </div>

              {/* QA */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-ink-secondary)]">QA Score</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register("qaScore", { valueAsNumber: true })}
                    className="w-full border rounded-[4px] px-2.5 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-ink-secondary)]">QA Percentile</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("qaPercentile", { valueAsNumber: true })}
                    className="w-full border rounded-[4px] px-2.5 py-1 text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-ink-secondary)] mb-1">
                Notes / Analysis (Optional)
              </label>
              <textarea
                {...register("notes")}
                rows={2}
                placeholder="Key mistakes, missed questions, strategy takeaways..."
                className="w-full border rounded-[4px] px-3 py-1.5 text-xs"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--color-hairline)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || mutation.isPending}
                className="px-5 py-2 rounded-full text-xs font-semibold bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50"
              >
                {mutation.isPending ? "Logging..." : "Log Mock Score"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
