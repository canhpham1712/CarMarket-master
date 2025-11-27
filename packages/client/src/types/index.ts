export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profileImage?: string;
  bio?: string;
  location?: string;
  dateOfBirth?: string;
  role?: "user" | "admin"; // Deprecated: kept for backward compatibility
  roles?: string[]; // RBAC role names (e.g., ['admin', 'seller'])
  isActive: boolean;
  isEmailVerified: boolean;
  provider?: string;
  createdAt: string;
  updatedAt: string;
  ratingStats?: RatingStats;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface CarDetail {
  id: string;
  make: string;
  model: string;
  year: number;
  bodyType: string;
  fuelType: string;
  transmission: string;
  engineSize: number;
  enginePower: number;
  mileage: number;
  color: string;
  numberOfDoors: number;
  numberOfSeats: number;
  condition: string;
  vin?: string;
  registrationNumber?: string;
  previousOwners?: number;
  hasAccidentHistory: boolean;
  hasServiceHistory: boolean;
  description?: string;
  features: string[];
  images: CarImage[];
  videos?: CarVideo[];
}

export interface CarImage {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  type: string;
  sortOrder: number;
  isPrimary: boolean;
  alt?: string;
}

export interface CarVideo {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
  alt?: string;
  duration?: number;
  thumbnailUrl?: string;
}

export interface ListingDetail {
  id: string;
  title: string;
  description: string;
  price: number;
  priceType: string;
  status: string;
  location: string;
  city?: string;
  state?: string;
  country?: string;
  viewCount: number;
  favoriteCount: number;
  inquiryCount: number;
  isActive: boolean;
  isFeatured: boolean;
  isUrgent: boolean;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  seller: User;
  carDetail: CarDetail;
}

export interface SearchFilters {
  // Search query for general search
  query?: string;
  // Specific filters
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  mileageMax?: number;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  condition?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  // Pagination and sorting
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SearchResponse {
  listings: ListingDetail[];
  pagination: PaginationInfo;
  filters: SearchFilters;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface CreateListingData {
  title: string;
  description: string;
  price: number;
  priceType?: string;
  location: string;
  city?: string;
  state?: string;
  country?: string;
  carDetail: Omit<CarDetail, "id" | "images">;
  images?: Omit<CarImage, "id" | "carDetailId">[];
}

export interface SellerRating {
  id: string;
  sellerId: string;
  buyerId: string;
  transactionId?: string | null;
  rating: number; // 1-5
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
  seller?: User;
  buyer?: User;
  transaction?: any;
}

export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface CreateRatingRequest {
  sellerId: string;
  rating: number;
  comment?: string;
  transactionId?: string;
}

export interface UpdateRatingRequest {
  rating?: number;
  comment?: string;
}

export interface RatingQueryParams {
  sellerId?: string;
  page?: number;
  limit?: number;
}

export interface RatingsResponse {
  ratings: SellerRating[];
  pagination: PaginationInfo;
}
