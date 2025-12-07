import { useState, useEffect, useRef } from "react";
import { User, FileText, Upload, X, CheckCircle, Edit, Eye, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { SellerVerificationService, VerificationLevel, DocumentType, type SellerVerification } from "../services/seller-verification.service";
import toast from "react-hot-toast";
import type { User as UserType } from "../types";

interface ViewEditStandardModalProps {
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

export function ViewEditStandardModal({
  open,
  onClose,
  onSuccess,
  userProfile,
  existingVerification,
}: ViewEditStandardModalProps) {
  const [idNumber, setIdNumber] = useState("");
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<any[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>(DocumentType.IDENTITY_CARD);
  const [documentNumber, setDocumentNumber] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && existingVerification) {
      setIdNumber(existingVerification.idNumber || "");
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

  const handleIdNumberChange = (value: string) => {
    setIdNumber(value);
    setHasChanges(value !== (existingVerification?.idNumber || ""));
  };

  const handleSubmit = async () => {
    if (!idNumber) {
      toast.error("Please enter your ID number");
      return;
    }

    if (!hasChanges) {
      toast("No changes to save", { icon: "ℹ️" });
      return;
    }

    // If new documents added, need to upload them
    if (documents.length === 0 && existingDocuments.length === 0) {
      toast.error("Please upload at least one identity document");
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
        idNumber: idNumber || undefined,
        verificationLevel: VerificationLevel.STANDARD,
        documents: documentsData,
      });

      toast.success("✅ Standard verification information updated successfully! Changes will be reviewed by admin.");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating Standard verification:", error);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? <Edit className="w-5 h-5 text-green-600" /> : <Eye className="w-5 h-5 text-green-600" />}
            {isEditing ? "Edit" : "View"} Standard Verification
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your standard verification information. Changes will require admin review."
              : "View your standard verification information. Click 'Edit' to make changes."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status Info */}
          {existingVerification && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-900">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">
                  Status: {existingVerification.status === "approved" ? "Verified" : "Under Review"}
                </span>
              </div>
              {existingVerification.approvedAt && (
                <p className="text-sm text-green-700 mt-1">
                  Approved on: {new Date(existingVerification.approvedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

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
            {isEditing ? (
              <Input
                value={idNumber}
                onChange={(e) => handleIdNumberChange(e.target.value)}
                placeholder="001234567890"
                disabled={submitting}
              />
            ) : (
              <Input value={idNumber || "N/A"} disabled className="bg-gray-50" />
            )}
            <p className="text-xs text-gray-500 mt-1">This is not stored in your profile</p>
          </div>

          {/* Documents */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Identity Documents *
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
              <div>
                {existingDocuments.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                    setIdNumber(existingVerification?.idNumber || "");
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
                  className="bg-green-600 text-white hover:bg-green-700"
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

