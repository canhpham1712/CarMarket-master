import { useState, useEffect, useRef } from "react";
import { User, FileText, Upload, X, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { SellerVerificationService, VerificationLevel, DocumentType, type SellerVerification } from "../services/seller-verification.service";
import toast from "react-hot-toast";
import type { User as UserType } from "../types";

interface StandardVerificationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userProfile: UserType | null;
  existingVerification: SellerVerification | null;
}

interface DocumentUpload {
  file: File;
  documentType: DocumentType;
  documentNumber?: string;
  preview?: string;
}

export function StandardVerificationModal({
  open,
  onClose,
  onSuccess,
  userProfile,
  existingVerification,
}: StandardVerificationModalProps) {
  const [idNumber, setIdNumber] = useState("");
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>(DocumentType.IDENTITY_CARD);
  const [documentNumber, setDocumentNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Pre-fill from existing verification if available
      if (existingVerification) {
        setIdNumber(existingVerification.idNumber || "");
      }
    }
  }, [open, existingVerification]);

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File "${file.name}" is too large. Maximum size is 5MB.`);
        return;
      }

      if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)|application\/pdf$/)) {
        toast.error(`"${file.name}" is not a supported format. Please use JPG, PNG, GIF, or PDF.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        setDocuments((prev) => [
          ...prev,
          {
            file,
            documentType: selectedDocumentType,
            documentNumber: documentNumber || undefined,
            preview: file.type.startsWith("image/") ? preview : undefined,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    event.target.value = "";
    setDocumentNumber("");
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!idNumber) {
      toast.error("Please enter your ID number");
      return;
    }

    if (documents.length === 0) {
      toast.error("Please upload at least one identity document");
      return;
    }

    try {
      setSubmitting(true);

      // Upload documents
      const documentFiles = documents.map((d) => d.file);
      const uploadResponse = await SellerVerificationService.uploadDocuments(documentFiles);

      // Prepare documents data
      const documentsData = documents.map((doc, index) => ({
        documentType: doc.documentType,
        documentNumber: doc.documentNumber,
        fileName: uploadResponse.documents[index].filename,
        fileUrl: uploadResponse.documents[index].url,
        fileSize: uploadResponse.documents[index].fileSize,
        mimeType: uploadResponse.documents[index].mimeType,
      }));

      // Submit verification
      const submitData = {
        idNumber: idNumber || undefined,
        verificationLevel: VerificationLevel.STANDARD,
        documents: documentsData,
      };
      console.log("Submitting verification with data:", submitData);
      const result = await SellerVerificationService.submitVerification(submitData);

      toast.success("✅ Standard verification request submitted successfully! Our team will review it within 24-48 hours.");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error submitting Standard verification:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response,
        data: error.response?.data,
        status: error.response?.status,
      });
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to submit verification request. Please try again.";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const fullName = userProfile
    ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim()
    : "";
  const phoneNumber = existingVerification?.phoneNumber || userProfile?.phoneNumber || "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-green-600" />
            Standard Verification
          </DialogTitle>
          <DialogDescription>
            Upgrade to Standard level by providing your identity document. This adds more trust to your seller profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Requirements Info */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900 font-medium mb-2">Requirements for Standard Verification:</p>
            <ul className="text-sm text-green-800 space-y-1">
              <li>✓ All Basic features (Email & Phone verified)</li>
              <li>✓ Identity document verified (CMND/CCCD/Passport)</li>
            </ul>
          </div>

          {/* Basic Info (Read-only) */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">Basic Information (Already Verified)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone Number</label>
                <div className="flex items-center gap-2">
                  <Input value={phoneNumber || "N/A"} disabled className="bg-white" />
                  {existingVerification?.isPhoneVerified && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Full Name</label>
                <Input value={fullName || "N/A"} disabled className="bg-white" />
              </div>
            </div>
          </div>

          {/* ID Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID Number (CMND/CCCD/Passport) *
            </label>
            <Input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="001234567890"
            />
            <p className="text-xs text-gray-500 mt-1">This is not stored in your profile</p>
          </div>

          {/* Document Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Identity Document *
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Upload clear photos or scans of your identity document. Accepted formats: JPG, PNG, GIF, PDF (Max 5MB each)
            </p>

            <div className="space-y-4">
              {/* Document Type Selector */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type
                  </label>
                  <select
                    value={selectedDocumentType}
                    onChange={(e) => setSelectedDocumentType(e.target.value as DocumentType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value={DocumentType.IDENTITY_CARD}>CMND/CCCD</option>
                    <option value={DocumentType.PASSPORT}>Passport</option>
                    <option value={DocumentType.DRIVING_LICENSE}>Driving License</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Number (Optional)
                  </label>
                  <Input
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="Document ID number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleDocumentUpload}
                    className="hidden"
                    multiple
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Files
                  </Button>
                </div>
              </div>

              {/* Uploaded Documents */}
              {documents.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {documents.map((doc, index) => (
                    <div key={index} className="relative border rounded-lg p-2">
                      {doc.preview ? (
                        <img
                          src={doc.preview}
                          alt={doc.documentType}
                          className="w-full h-32 object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
                          <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {doc.documentType.replace("_", " ")}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {doc.file.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !idNumber || documents.length === 0}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                "Submit for Verification"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

