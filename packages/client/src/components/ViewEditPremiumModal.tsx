import { useState, useEffect, useRef } from "react";
import { CreditCard, MapPin, FileText, Upload, X, CheckCircle, Edit, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { SellerVerificationService, VerificationLevel, DocumentType, type SellerVerification } from "../services/seller-verification.service";
import toast from "react-hot-toast";
import type { User as UserType } from "../types";

interface ViewEditPremiumModalProps {
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

export function ViewEditPremiumModal({
  open,
  onClose,
  onSuccess,
  userProfile,
  existingVerification,
}: ViewEditPremiumModalProps) {
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("Vietnam");
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<any[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>(DocumentType.ADDRESS_PROOF);
  const [documentNumber, setDocumentNumber] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && existingVerification) {
      setBankName(existingVerification.bankName || "");
      setBankAccountNumber(existingVerification.bankAccountNumber || "");
      setAccountHolderName(existingVerification.accountHolderName || "");
      setAddress(existingVerification.address || "");
      setCity(existingVerification.city || "");
      setState(existingVerification.state || "");
      setCountry(existingVerification.country || "Vietnam");
      setExistingDocuments(existingVerification.documents || []);
      setDocuments([]);
      setIsEditing(false);
      setHasChanges(false);
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
        setHasChanges(true);
      };
      reader.readAsDataURL(file);
    });

    event.target.value = "";
    setDocumentNumber("");
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => {
      const newDocs = prev.filter((_, i) => i !== index);
      setHasChanges(newDocs.length !== documents.length);
      return newDocs;
    });
  };

  const checkHasChanges = () => {
    const original = existingVerification;
    return (
      bankName !== (original?.bankName || "") ||
      bankAccountNumber !== (original?.bankAccountNumber || "") ||
      accountHolderName !== (original?.accountHolderName || "") ||
      address !== (original?.address || "") ||
      city !== (original?.city || "") ||
      state !== (original?.state || "") ||
      country !== (original?.country || "Vietnam") ||
      documents.length > 0
    );
  };

  const handleFieldChange = () => {
    setHasChanges(checkHasChanges());
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

    if (!hasChanges) {
      toast.info("No changes to save");
      return;
    }

    try {
      setSubmitting(true);

      let documentsData: any[] = [];

      // If new documents added, upload them
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
      } else {
        // Use existing documents
        documentsData = existingDocuments.map((doc) => ({
          documentType: doc.documentType,
          documentNumber: doc.documentNumber,
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
        }));
      }

      await SellerVerificationService.submitVerification({
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

      toast.success("✅ Premium verification information updated successfully! Changes will be reviewed by admin.");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating Premium verification:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update verification information. Please try again.";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const fullName = userProfile
    ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim()
    : existingVerification?.fullName || "";
  const phoneNumber = existingVerification?.phoneNumber || userProfile?.phoneNumber || "";
  const idNumber = existingVerification?.idNumber || "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? <Edit className="w-5 h-5 text-purple-600" /> : <Eye className="w-5 h-5 text-purple-600" />}
            {isEditing ? "Edit" : "View"} Premium Verification
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your premium verification information. Changes will require admin review."
              : "View your premium verification information. Click 'Edit' to make changes."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status Info */}
          {existingVerification && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 text-purple-900">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">
                  Status: {existingVerification.status === "approved" ? "Verified" : "Under Review"}
                </span>
              </div>
              {existingVerification.approvedAt && (
                <p className="text-sm text-purple-700 mt-1">
                  Approved on: {new Date(existingVerification.approvedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

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
                {isEditing ? (
                  <Input
                    value={bankName}
                    onChange={(e) => {
                      setBankName(e.target.value);
                      handleFieldChange();
                    }}
                    placeholder="Vietcombank, Techcombank, etc."
                    disabled={submitting}
                  />
                ) : (
                  <Input value={bankName || "N/A"} disabled className="bg-gray-50" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number *
                </label>
                {isEditing ? (
                  <Input
                    value={bankAccountNumber}
                    onChange={(e) => {
                      setBankAccountNumber(e.target.value);
                      handleFieldChange();
                    }}
                    placeholder="Account number"
                    disabled={submitting}
                  />
                ) : (
                  <Input value={bankAccountNumber || "N/A"} disabled className="bg-gray-50" />
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name *
                </label>
                {isEditing ? (
                  <Input
                    value={accountHolderName}
                    onChange={(e) => {
                      setAccountHolderName(e.target.value);
                      handleFieldChange();
                    }}
                    placeholder="Must match your full name"
                    disabled={submitting}
                  />
                ) : (
                  <Input value={accountHolderName || "N/A"} disabled className="bg-gray-50" />
                )}
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
                {isEditing ? (
                  <Input
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      handleFieldChange();
                    }}
                    placeholder="123 Main Street, District 1"
                    disabled={submitting}
                  />
                ) : (
                  <Input value={address || "N/A"} disabled className="bg-gray-50" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                {isEditing ? (
                  <Input
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      handleFieldChange();
                    }}
                    placeholder="Ho Chi Minh City"
                    disabled={submitting}
                  />
                ) : (
                  <Input value={city || "N/A"} disabled className="bg-gray-50" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province
                </label>
                {isEditing ? (
                  <Input
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value);
                      handleFieldChange();
                    }}
                    placeholder="Optional"
                    disabled={submitting}
                  />
                ) : (
                  <Input value={state || "N/A"} disabled className="bg-gray-50" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                {isEditing ? (
                  <Input
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      handleFieldChange();
                    }}
                    disabled={submitting}
                  />
                ) : (
                  <Input value={country || "Vietnam"} disabled className="bg-gray-50" />
                )}
              </div>
            </div>
          </div>

          {/* Documents */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Documents (Address Proof, Bank Statement, etc.)
            </label>
            {isEditing ? (
              <div className="space-y-4">
                {/* Existing Documents */}
                {existingDocuments.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Current Documents:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      {existingDocuments.map((doc, index) => (
                        <div key={index} className="relative border rounded-lg p-2">
                          {doc.fileUrl && (
                            <a
                              href={`http://localhost:3000${doc.fileUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              {doc.mimeType?.startsWith("image/") ? (
                                <img
                                  src={`http://localhost:3000${doc.fileUrl}`}
                                  alt={doc.documentType}
                                  className="w-full h-32 object-cover rounded"
                                />
                              ) : (
                                <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
                                  <FileText className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                            </a>
                          )}
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-700 truncate">
                              {doc.documentType?.replace("_", " ") || "Document"}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {doc.fileName || "N/A"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload New Documents */}
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
                      Add Files
                    </Button>
                  </div>
                </div>

                {/* New Documents Preview */}
                {documents.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">New Documents to Upload:</p>
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
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {existingDocuments.length > 0 ? (
                  existingDocuments.map((doc, index) => (
                    <div key={index} className="relative border rounded-lg p-2">
                      {doc.fileUrl && (
                        <a
                          href={`http://localhost:3000${doc.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          {doc.mimeType?.startsWith("image/") ? (
                            <img
                              src={`http://localhost:3000${doc.fileUrl}`}
                              alt={doc.documentType}
                              className="w-full h-32 object-cover rounded"
                            />
                          ) : (
                            <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
                              <FileText className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </a>
                      )}
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {doc.documentType?.replace("_", " ") || "Document"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {doc.fileName || "N/A"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No documents uploaded</p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset to original values
                    const original = existingVerification;
                    setBankName(original?.bankName || "");
                    setBankAccountNumber(original?.bankAccountNumber || "");
                    setAccountHolderName(original?.accountHolderName || "");
                    setAddress(original?.address || "");
                    setCity(original?.city || "");
                    setState(original?.state || "");
                    setCountry(original?.country || "Vietnam");
                    setDocuments([]);
                    setHasChanges(false);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !hasChanges}
                  className="bg-purple-600 text-white hover:bg-purple-700"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

