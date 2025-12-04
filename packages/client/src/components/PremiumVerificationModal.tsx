import { useState, useEffect, useRef } from "react";
import { CreditCard, MapPin, FileText, Upload, X, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { SellerVerificationService, VerificationLevel, DocumentType, type SellerVerification } from "../services/seller-verification.service";
import toast from "react-hot-toast";
import type { User as UserType } from "../types";

interface PremiumVerificationModalProps {
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

export function PremiumVerificationModal({
  open,
  onClose,
  onSuccess,
  userProfile,
  existingVerification,
}: PremiumVerificationModalProps) {
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("Vietnam");
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>(DocumentType.ADDRESS_PROOF);
  const [documentNumber, setDocumentNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Pre-fill from existing verification if available
      if (existingVerification) {
        setBankName(existingVerification.bankName || "");
        setBankAccountNumber(existingVerification.bankAccountNumber || "");
        setAccountHolderName(existingVerification.accountHolderName || "");
        setAddress(existingVerification.address || "");
        setCity(existingVerification.city || "");
        setState(existingVerification.state || "");
        setCountry(existingVerification.country || "Vietnam");
      } else if (userProfile) {
        // Pre-fill address from profile
        setAddress(userProfile.location || "");
      }
    }
  }, [open, existingVerification, userProfile]);

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
    if (!bankName || !bankAccountNumber || !accountHolderName) {
      toast.error("Please fill in all bank information fields");
      return;
    }

    if (!address || !city) {
      toast.error("Please fill in address and city");
      return;
    }

    try {
      setSubmitting(true);

      // Upload documents if any
      let documentsData: any[] = [];
      if (documents.length > 0) {
        const documentFiles = documents.map((d) => d.file);
        const uploadResponse = await SellerVerificationService.uploadDocuments(documentFiles);

        documentsData = documents.map((doc, index) => ({
          documentType: doc.documentType,
          documentNumber: doc.documentNumber,
          fileName: uploadResponse.documents[index].filename,
          fileUrl: uploadResponse.documents[index].url,
          fileSize: uploadResponse.documents[index].fileSize,
          mimeType: uploadResponse.documents[index].mimeType,
        }));
      }

      // Submit verification
      const result = await SellerVerificationService.submitVerification({
        bankName: bankName,
        bankAccountNumber: bankAccountNumber,
        accountHolderName: accountHolderName,
        address: address,
        city: city,
        state: state || undefined,
        country: country,
        verificationLevel: VerificationLevel.PREMIUM,
        documents: documentsData,
      });

      toast.success("✅ Premium verification request submitted successfully! Our team will review it within 24-48 hours.");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error submitting Premium verification:", error);
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
  const idNumber = existingVerification?.idNumber || "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            Premium Verification
          </DialogTitle>
          <DialogDescription>
            Complete Premium verification by providing bank account and address information. This is the highest level of seller verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Requirements Info */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-900 font-medium mb-2">Requirements for Premium Verification:</p>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>✓ All Standard features (Email, Phone, Identity verified)</li>
              <li>✓ Bank account verified</li>
              <li>✓ Address proof verified</li>
            </ul>
          </div>

          {/* Standard Info (Read-only) */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">Standard Information (Already Verified)</h3>
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
              <div>
                <label className="block text-sm text-gray-600 mb-1">ID Number</label>
                <Input value={idNumber || "N/A"} disabled className="bg-white" />
              </div>
            </div>
          </div>

          {/* Bank Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Bank Information *
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name *
                </label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Vietcombank, Techcombank, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number *
                </label>
                <Input
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="Account number"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name *
                </label>
                <Input
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="Must match your full name"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              Address Information *
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Address *
                </label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street, District 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ho Chi Minh City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province
                </label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  defaultValue="Vietnam"
                />
              </div>
            </div>
          </div>

          {/* Additional Documents (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Documents (Optional - for address proof)
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Upload documents to verify your address (utility bills, bank statements, etc.)
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value={DocumentType.ADDRESS_PROOF}>Address Proof</option>
                    <option value={DocumentType.BANK_STATEMENT}>Bank Statement</option>
                    <option value={DocumentType.BUSINESS_LICENSE}>Business License</option>
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
              disabled={
                submitting ||
                !bankName ||
                !bankAccountNumber ||
                !accountHolderName ||
                !address ||
                !city
              }
              className="bg-purple-600 text-white hover:bg-purple-700"
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

