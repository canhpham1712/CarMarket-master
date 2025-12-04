import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { CarCard } from "./CarCard";
import { RecommendationsService } from "../services/recommendations.service";
import type { RecommendationListing } from "../services/recommendations.service";
import { useAuthStore } from "../store/auth";
import { Button } from "./ui/Button";

interface RecommendationsSectionProps {
  limit?: number;
  title?: string;
  showRefresh?: boolean;
}

export function RecommendationsSection({
  limit = 3,
  title = "Recommended for You",
  showRefresh = true,
}: RecommendationsSectionProps) {
  const { isAuthenticated } = useAuthStore();
  const [recommendations, setRecommendations] = useState<RecommendationListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async (refresh: boolean = false) => {
    if (!isAuthenticated) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await RecommendationsService.getRecommendations(limit, refresh);
      setRecommendations(response.recommendations || []);
    } catch (err: any) {
      console.error("Error fetching recommendations:", err);
      setError(err.response?.data?.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecommendations();
    }
  }, [isAuthenticated, limit]);

  if (!isAuthenticated) {
    return null;
  }

  if (loading && recommendations.length === 0) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-200 animate-pulse rounded-lg h-96"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error && recommendations.length === 0) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold">{title}</h2>
            </div>
            {showRefresh && (
              <Button
                onClick={() => fetchRecommendations(true)}
                variant="outline"
                size="sm"
              >
                Refresh
              </Button>
            )}
          </div>
          <div className="text-center py-8 text-gray-500">
            <p>{error}</p>
            {showRefresh && (
              <Button
                onClick={() => fetchRecommendations(true)}
                variant="outline"
                className="mt-4"
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
          {showRefresh && (
            <Button
              onClick={() => fetchRecommendations(true)}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          )}
        </div>

        {recommendations.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-6">
            {recommendations.map((listing) => (
              <div key={listing.id} className="relative w-full sm:w-[calc(50%-0.75rem)] lg:w-[320px] xl:w-[320px] max-w-sm">
                <CarCard listing={listing} compact={true} />
                {listing.recommendationReason && (
                  <div className="mt-2 text-xs text-gray-500 px-2">
                    <span className="font-medium">Why:</span> {listing.recommendationReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No recommendations available yet.</p>
            <p className="text-sm mt-2">
              Add some favorites to get personalized recommendations!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

