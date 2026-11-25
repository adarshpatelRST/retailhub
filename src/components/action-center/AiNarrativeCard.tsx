import * as React from "react";
import { Bot, CheckCircle, Loader2, Sparkles } from "lucide-react";
import { type AiExplanationDto } from "@/api/action-center.api";
import { cn } from "@/lib/utils";

export interface AiNarrativeCardProps {
  explanation: AiExplanationDto | null;
  fallbackText?: string | null;
  loading?: boolean;
  className?: string;
}

export const AiNarrativeCard: React.FC<AiNarrativeCardProps> = ({
  explanation,
  fallbackText,
  loading = false,
  className,
}) => {
  const narrativeText =
    explanation?.narrative ||
    fallbackText ||
    "Evaluating regional velocity, donor excess cover, and line-haul road distance to synthesize executive recommendation rationale.";

  return (
    <div
      className={cn(
        "rounded-lg border border-indigo-200/80 bg-gradient-to-br from-indigo-50/50 via-background to-purple-50/40 p-4 shadow-xs space-y-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-100/80 px-2.5 py-0.5 text-xs font-semibold text-indigo-950">
          <Sparkles className="h-3.5 w-3.5 size-3.5 text-indigo-600 shrink-0" />
          <span>AI Executive Briefing</span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <Bot className="h-3.5 w-3.5 size-3.5 text-indigo-600 shrink-0" />
          <span>{explanation?.model ?? "LangChain • Gemini 2.5 Flash"}</span>
          {explanation?.confidenceScore && (
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-900">
              {(explanation.confidenceScore * 100).toFixed(0)}% Conf.
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 size-4 animate-spin text-indigo-600 shrink-0" />
          <span>Synthesizing LangChain operational briefing...</span>
        </div>
      ) : (
        <>
          <p className="text-xs sm:text-sm text-foreground leading-relaxed">
            {narrativeText}
          </p>

          {explanation?.keyDrivers && explanation.keyDrivers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {explanation.keyDrivers.map((driver: string, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded border border-indigo-200/70 bg-white/80 px-2 py-0.5 text-[11px] text-indigo-950"
                >
                  <CheckCircle className="h-3 w-3 size-3 text-indigo-600 shrink-0" />
                  <span>{driver}</span>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
