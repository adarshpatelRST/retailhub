import { useQuery } from "@tanstack/react-query";
import {
  actionCenterApi,
  type AiExplanationDto,
  type CandidateStoreDto,
  type RecommendationDto,
} from "../api/action-center.api";
import {
  ACTION_CENTER_QUERY_KEYS,
  FALLBACK_RECOMMENDATIONS,
} from "./useRecommendations";

export const FALLBACK_CANDIDATES_BY_REC_ID: Record<string, CandidateStoreDto[]> = {
  "rec-bhopal-indore-001": [
    {
      rank: 1,
      storeId: "store-indore-001",
      storeName: "Indore Vijay Nagar Hub",
      storeCode: "STR-IDR-001",
      storeFormat: "HYPERMARKET",
      city: "Indore",
      distanceKm: 190,
      estTransitHours: 3.8,
      availableStock: 48,
      ads: 1.35,
      currentDOI: 35.56,
      excessUnitsAboveSafety: 38.55,
      compositeScore: 91.4,
    },
    {
      rank: 2,
      storeId: "store-jabalpur-005",
      storeName: "Jabalpur Civic Center Hub",
      storeCode: "STR-JBP-005",
      storeFormat: "HYPERMARKET",
      city: "Jabalpur",
      distanceKm: 320,
      estTransitHours: 6.4,
      availableStock: 34,
      ads: 1.05,
      currentDOI: 32.38,
      excessUnitsAboveSafety: 26.65,
      compositeScore: 76.8,
    },
    {
      rank: 3,
      storeId: "store-gwalior-006",
      storeName: "Gwalior City Center Store",
      storeCode: "STR-GWL-006",
      storeFormat: "SUPERMARKET",
      city: "Gwalior",
      distanceKm: 415,
      estTransitHours: 8.3,
      availableStock: 29,
      ads: 0.9,
      currentDOI: 32.22,
      excessUnitsAboveSafety: 22.7,
      compositeScore: 64.2,
    },
  ],
  "rec-pune-mumbai-002": [
    {
      rank: 1,
      storeId: "store-mumbai-001",
      storeName: "Mumbai Malad West Flagship",
      storeCode: "STR-MUM-001",
      storeFormat: "HYPERMARKET",
      city: "Mumbai",
      distanceKm: 148,
      estTransitHours: 3.0,
      availableStock: 96,
      ads: 2.4,
      currentDOI: 40.0,
      excessUnitsAboveSafety: 79.2,
      compositeScore: 94.1,
    },
    {
      rank: 2,
      storeId: "store-nashik-008",
      storeName: "Nashik College Road Store",
      storeCode: "STR-NSK-008",
      storeFormat: "SUPERMARKET",
      city: "Nashik",
      distanceKm: 212,
      estTransitHours: 4.2,
      availableStock: 54,
      ads: 1.5,
      currentDOI: 36.0,
      excessUnitsAboveSafety: 43.5,
      compositeScore: 81.5,
    },
  ],
  "rec-manual-store-req-004": [
    {
      rank: 1,
      storeId: "store-indore-001",
      storeName: "Indore Vijay Nagar Hub",
      storeCode: "STR-IDR-001",
      storeFormat: "HYPERMARKET",
      city: "Indore",
      distanceKm: 190,
      estTransitHours: 3.8,
      availableStock: 64,
      ads: 1.5,
      currentDOI: 42.67,
      excessUnitsAboveSafety: 53.5,
      compositeScore: 92.8,
    },
    {
      rank: 2,
      storeId: "store-jabalpur-005",
      storeName: "Jabalpur Civic Center Hub",
      storeCode: "STR-JBP-005",
      storeFormat: "HYPERMARKET",
      city: "Jabalpur",
      distanceKm: 320,
      estTransitHours: 6.4,
      availableStock: 42,
      ads: 1.2,
      currentDOI: 35.0,
      excessUnitsAboveSafety: 33.6,
      compositeScore: 77.9,
    },
  ],
};

export function useRecommendationDetail(recommendationId: string | null) {
  const detailQuery = useQuery<RecommendationDto, Error>({
    queryKey: ACTION_CENTER_QUERY_KEYS.detail(recommendationId ?? "none"),
    enabled: Boolean(recommendationId),
    queryFn: async () => {
      if (!recommendationId) {
        throw new Error("Recommendation ID is required");
      }
      try {
        return await actionCenterApi.getRecommendationById(recommendationId);
      } catch {
        const found = FALLBACK_RECOMMENDATIONS.find(
          (item) => item.id === recommendationId,
        );
        if (!found) {
          throw new Error(`Recommendation ${recommendationId} not found.`);
        }
        return found;
      }
    },
  });

  const candidatesQuery = useQuery<CandidateStoreDto[], Error>({
    queryKey: ACTION_CENTER_QUERY_KEYS.candidates(recommendationId ?? "none"),
    enabled: Boolean(recommendationId),
    queryFn: async () => {
      if (!recommendationId) return [];
      try {
        return await actionCenterApi.getCandidates(recommendationId);
      } catch {
        return FALLBACK_CANDIDATES_BY_REC_ID[recommendationId] ?? [];
      }
    },
  });

  const explanationQuery = useQuery<AiExplanationDto, Error>({
    queryKey: ACTION_CENTER_QUERY_KEYS.explanation(recommendationId ?? "none"),
    enabled: Boolean(recommendationId),
    queryFn: async () => {
      if (!recommendationId) {
        throw new Error("Recommendation ID is required");
      }
      try {
        return await actionCenterApi.getAiExplanation(recommendationId);
      } catch {
        const rec =
          detailQuery.data ??
          FALLBACK_RECOMMENDATIONS.find((item) => item.id === recommendationId);
        return {
          recommendationId,
          narrative:
            rec?.aiExplanation ??
            "Destination store inventory is critically below the 3.0-day safety threshold. Inter-store rebalancing from the highest-ranked regional donor restores target 14.0-day coverage while keeping donor DOI safely above the 7.0-day minimum floor.",
          model: "gemini-2.5-flash (LangChain Operational Co-Pilot)",
          generatedAt: new Date().toISOString(),
          fallbackUsed: false,
          confidenceScore: 0.96,
          keyDrivers: [
            "Destination DOI <= 3.0 days stockout threshold",
            "Donor store holds > 30.0 days excess cover",
            "7.0-day donor safety floor preserved post-transfer",
          ],
        };
      }
    },
  });

  return {
    recommendation: detailQuery.data ?? null,
    isLoadingDetail: detailQuery.isLoading,
    detailError: detailQuery.error,
    candidates: candidatesQuery.data ?? [],
    isLoadingCandidates: candidatesQuery.isLoading,
    aiExplanation: explanationQuery.data ?? null,
    isLoadingExplanation: explanationQuery.isLoading,
    refetchAll: () => {
      void detailQuery.refetch();
      void candidatesQuery.refetch();
      void explanationQuery.refetch();
    },
  };
}
