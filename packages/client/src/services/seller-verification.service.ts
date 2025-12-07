import { apiClient } from "../lib/api";

export enum VerificationStatus {
  PENDING = "pending",
  IN_REVIEW = "in_review",
  APPROVED = "approved",
  REJECTED = "rejected",
  EXPIRED = "expired",
}

export enum VerificationLevel {
  BASIC = "basic",
  STANDARD = "standard",
  PREMIUM = "premium",
}

export enum DocumentType {
  IDENTITY_CARD = "identity_card",
  PASSPORT = "passport",
  DRIVING_LICENSE = "driving_license",
  BANK_STATEMENT = "bank_statement",
  ADDRESS_PROOF = "address_proof",
  BUSINESS_LICENSE = "business_license",
}

export interface VerificationDocument {
  documentType: DocumentType;
  documentNumber?: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
}

export interface SellerVerification {
  rejectedAt: string | Date;
  id: string;
  userId: string;
  status: VerificationStatus;
  verificationLevel: VerificationLevel;
  phoneNumber?: string;
  isPhoneVerified: boolean;
  phoneVerifiedAt?: string;
  phoneVerificationDeadline?: string;
  fullName?: string;
  idNumber?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  bankName?: string;
  bankAccountNumber?: string;
  accountHolderName?: string;
  isBankVerified: boolean;
  bankVerifiedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  adminNotes?: string;
  submittedAt: string;
  approvedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  documents?: VerificationDocument[];
}

export interface SubmitVerificationRequest {
  phoneNumber?: string;
  fullName?: string;
  idNumber?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  bankName?: string;
  bankAccountNumber?: string;
  accountHolderName?: string;
  documents: VerificationDocument[];
  verificationLevel?: VerificationLevel;
}

export interface ReviewVerificationRequest {
  status: VerificationStatus;
  rejectionReason?: string;
  adminNotes?: string;
}

export class SellerVerificationService {
  /**
   * Get current user's verification status
   */
  static async getMyVerificationStatus(): Promise<SellerVerification | null> {
    try {
      // apiClient.get returns response.data directly
      const response = await apiClient.get<SellerVerification | null>(
        "/seller-verification/status"
      );
      
      // Handle null, undefined, or empty response
      if (response === null || response === undefined) {
        return null;
      }
      
      // If response is an object with id property, it's a valid verification
      if (typeof response === 'object' && response !== null && 'id' in response) {
        return response as SellerVerification;
      }
      
      // Otherwise return null
      return null;
    } catch (error: any) {
      // If 404, return null (no verification record exists)
      if (error.response?.status === 404) {
        return null;
      }
      // For other errors, log and return null
      console.error("Error fetching verification status:", error);
      return null;
    }
  }

  /**
   * Submit verification request
   */
  static async submitVerification(
    data: SubmitVerificationRequest
  ): Promise<SellerVerification> {
    try {
      console.log("SellerVerificationService.submitVerification called with:", data);
      // apiClient.post() already returns response.data
      const result = await apiClient.post<SellerVerification>(
        "/seller-verification/submit",
        data
      );
      console.log("SellerVerificationService.submitVerification success:", result);
      return result;
    } catch (error: any) {
      console.error("SellerVerificationService.submitVerification error:", error);
      console.error("Error response:", error.response);
      throw error;
    }
  }

  /**
   * Admin: Get all pending verifications
   */
  static async getPendingVerifications(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    verifications: SellerVerification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    // apiClient.get() already returns response.data, so we return response directly
    return await apiClient.get(
      `/seller-verification/admin/pending?page=${page}&limit=${limit}`
    );
  }

  /**
   * Admin: Get verification by ID
   */
  static async getVerificationById(
    id: string
  ): Promise<SellerVerification> {
    // apiClient.get() already returns response.data
    return await apiClient.get<SellerVerification>(
      `/seller-verification/admin/${id}`
    );
  }

  /**
   * Admin: Review and approve/reject verification
   */
  static async reviewVerification(
    id: string,
    data: ReviewVerificationRequest
  ): Promise<SellerVerification> {
    // apiClient.put() already returns response.data
    return await apiClient.put<SellerVerification>(
      `/seller-verification/admin/${id}/review`,
      data
    );
  }

  /**
   * Request OTP for phone verification
   */
  static async requestPhoneVerification(
    phoneNumber: string
  ): Promise<{ success: boolean; message: string; expiresAt: string | Date }> {
    const response = await apiClient.post<{ success: boolean; message: string; expiresAt: string | Date }>(
      "/seller-verification/request-phone-verification",
      { phoneNumber }
    );
    // apiClient.post already returns response.data, so we can return directly
    return response;
  }

  /**
   * Verify phone number with OTP code
   */
  static async verifyPhone(
    phoneNumber: string,
    otpCode: string
  ): Promise<{ success: boolean; message: string; isPhoneVerified: boolean }> {
    const response = await apiClient.post<{ success: boolean; message: string; isPhoneVerified: boolean }>(
      "/seller-verification/verify-phone",
      { phoneNumber, otpCode } // Backend DTO expects 'otpCode'
    );
    return response;
  }

  /**
   * Check if user is verified seller
   */
  static async checkIfVerified(userId: string): Promise<{
    isVerified: boolean;
    level: VerificationLevel | null;
  }> {
    // apiClient.get() already returns response.data
    return await apiClient.get(
      `/seller-verification/check/${userId}`
    );
  }

  /**
   * Upload verification documents
   */
  static async uploadDocuments(files: File[]): Promise<{
    documents: Array<{
      filename: string;
      url: string;
      originalName: string;
      fileSize: number;
      mimeType: string;
    }>;
  }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append(`documents`, file);
    });

    return await apiClient.post<{
      documents: Array<{
        filename: string;
        url: string;
        originalName: string;
        fileSize: number;
        mimeType: string;
      }>;
    }>("/seller-verification/upload-documents", formData);
  }
}

