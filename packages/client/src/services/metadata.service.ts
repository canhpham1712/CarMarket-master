import { useState, useEffect } from "react";
import { apiClient } from "../lib/api";

export interface CarMake {
  id: string;
  name: string;
  displayName: string;
  logoUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CarModel {
  id: string;
  name: string;
  displayName: string;
  makeId: string;
  isActive: boolean;
  sortOrder: number;
  bodyStyles: string[];
  defaultBodyStyle: string;
}

export interface CarMetadata {
  id: string;
  type: string;
  value: string;
  displayValue: string;
  description?: string;
  iconUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CarMakeWithModels extends CarMake {
  models: CarModel[];
}

export interface AllMetadata {
  fuelTypes: CarMetadata[];
  transmissionTypes: CarMetadata[];
  bodyTypes: CarMetadata[];
  conditions: CarMetadata[];
  priceTypes: CarMetadata[];
  carFeatures: CarMetadata[];
  colors: CarMetadata[];
  makes: CarMake[];
}

export class MetadataService {
  static async getAllMakes(): Promise<CarMake[]> {
    return apiClient.get<CarMake[]>("/metadata/makes");
  }

  static async getModelsByMake(makeId: string): Promise<CarModel[]> {
    return apiClient.get<CarModel[]>(`/metadata/makes/${makeId}/models`);
  }

  static async getMakesWithModels(): Promise<CarMakeWithModels[]> {
    return apiClient.get<CarMakeWithModels[]>("/metadata/makes-with-models");
  }

  static async getFuelTypes(): Promise<CarMetadata[]> {
    return apiClient.get<CarMetadata[]>("/metadata/fuel-types");
  }

  static async getTransmissionTypes(): Promise<CarMetadata[]> {
    return apiClient.get<CarMetadata[]>("/metadata/transmission-types");
  }

  static async getBodyTypes(): Promise<CarMetadata[]> {
    return apiClient.get<CarMetadata[]>("/metadata/body-types");
  }

  static async getConditions(): Promise<CarMetadata[]> {
    return apiClient.get<CarMetadata[]>("/metadata/conditions");
  }

  static async getPriceTypes(): Promise<CarMetadata[]> {
    return apiClient.get<CarMetadata[]>("/metadata/price-types");
  }

  static async getCarFeatures(): Promise<CarMetadata[]> {
    return apiClient.get<CarMetadata[]>("/metadata/car-features");
  }

  static async getColors(): Promise<CarMetadata[]> {
    return apiClient.get<CarMetadata[]>("/metadata/colors");
  }

  static async getAllMetadata(): Promise<AllMetadata> {
    return apiClient.get<AllMetadata>("/metadata/all");
  }

  static async seedInitialData(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("/metadata/seed");
  }
}

// Create a hook for metadata
export const useMetadata = () => {
  const [metadata, setMetadata] = useState<AllMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const data = await MetadataService.getAllMetadata();
        setMetadata(data);
      } catch (err) {
        setError("Failed to load metadata");
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, []);

  return { metadata, loading, error };
};
