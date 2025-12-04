import { useState, useEffect } from "react";
import { Car, ArrowRight } from "lucide-react";
import { CarCard } from "./CarCard";
import { RecommendationsService } from "../services/recommendations.service";
import type { SimilarListing } from "../services/recommendations.service";
import { Link } from "react-router-dom";
import { Button } from "./ui/Button";

interface SimilarCarsSectionProps {
  listingId: string;
  limit?: number;
  title?: string;
}

export function SimilarCarsSection({
  listingId,
  limit = 3,
  title = "Similar Cars",
}: SimilarCarsSectionProps) {
  const [similarCars, setSimilarCars] = useState<SimilarListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listingId) {
      return;
    }

    setLoading(true);
    setError(null);

    RecommendationsService.getSimilarListings(listingId, limit)
      .then((response) => {
        setSimilarCars(response.similar || []);
      })
      .catch((err: any) => {
        console.error("Error fetching similar cars:", err);
        setError(err.response?.data?.message || "Failed to load similar cars");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [listingId, limit]);

  if (loading && similarCars.length === 0) {
    return (
      <section className="py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
            <Car className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
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

  if (error && similarCars.length === 0) {
    return null; // Don't show error state for similar cars
  }

  if (similarCars.length === 0) {
    return null;
  }

  return (
    <section className="py-8 border-t">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Car className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {similarCars.map((listing) => (
            <CarCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </section>
  );
}

