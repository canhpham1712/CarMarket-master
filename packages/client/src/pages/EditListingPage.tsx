import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Save,
  Upload,
  X,
  FileText,
  Car,
  Camera,
  Video,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EnhancedSelect } from "../components/ui/EnhancedSelect";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { ListingService, type CreateListingPayload } from "../services/listing.service";
import { useMetadata } from "../services/metadata.service";
import type { ListingDetail } from "../types";
import { DraggableImageGallery } from "../components/DraggableImageGallery";
import { LocationPicker } from "../components/LocationPicker";
import { SOCKET_URL } from "../lib/constants";

const editListingSchema = z.object({
  // Listing Information
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  price: z.number().min(1, "Price must be greater than 0"),
  priceType: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),

  // Car Details
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z
    .number()
    .min(1900, "Invalid year")
    .max(new Date().getFullYear() + 1, "Invalid year"),
  bodyType: z.string().min(1, "Body type is required"),
  fuelType: z.string().min(1, "Fuel type is required"),
  transmission: z.string().min(1, "Transmission is required"),
  engineSize: z.number().min(0.1, "Engine size must be greater than 0"),
  enginePower: z.number().min(1, "Engine power must be greater than 0"),
  mileage: z.number().min(0, "Mileage cannot be negative"),
  color: z.string().min(1, "Color is required"),
  numberOfDoors: z.number().min(2).max(6).optional(),
  numberOfSeats: z.number().min(2).max(9).optional(),
  condition: z.string().min(1, "Condition is required"),
  vin: z.string().optional(),
  registrationNumber: z.string().optional(),
  previousOwners: z.number().min(0).optional(),
  carDescription: z.string().optional(),
  features: z.array(z.string()).optional(),
});

type EditListingForm = z.infer<typeof editListingSchema>;

export function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [currentImages, setCurrentImages] = useState<any[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<File[]>([]);
  const [currentVideos, setCurrentVideos] = useState<any[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMakeId, setSelectedMakeId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [formValues, setFormValues] = useState({
    priceType: "",
    bodyType: "",
    fuelType: "",
    transmission: "",
    color: "",
    condition: "",
    numberOfDoors: "",
    numberOfSeats: "",
  });
  const [locationData, setLocationData] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    city?: string;
    state?: string;
    country?: string;
  } | null>(null);
  const { metadata, loading: metadataLoading } = useMetadata();


  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditListingForm>({
    resolver: zodResolver(editListingSchema),
    defaultValues: {
      numberOfDoors: 4,
      numberOfSeats: 5,
      priceType: "negotiable",
      country: "USA",
    },
  });

  useEffect(() => {
    if (id) {
      fetchListing(id);
    }
  }, [id]);

  // Set make ID when listing and metadata are both loaded
  useEffect(() => {
    if (listing && metadata?.makes && !selectedMakeId) {
      const listingMake = listing.carDetail.make?.trim();
      const make = metadata.makes.find(
        (m) => 
          m.name?.toLowerCase() === listingMake?.toLowerCase() || 
          m.displayName?.toLowerCase() === listingMake?.toLowerCase()
      );
      if (make) {
        setSelectedMakeId(make.id);
      }
    }
  }, [listing, metadata, selectedMakeId]);

  // Load models when make is selected
  useEffect(() => {
    const loadModels = async () => {
      if (selectedMakeId && metadata?.makes) {
        const selectedMake = metadata.makes.find(
          (make) => make.id === selectedMakeId
        );
        if (selectedMake) {
          setValue("make", selectedMake.name);
          
          // Only reset model if this is a user-initiated change (not initial load)
          // Check if listing exists and make matches - if so, don't reset
          const shouldResetModel = !listing || 
            (selectedMake.name !== listing.carDetail.make && 
             selectedMake.displayName !== listing.carDetail.make);
          
          if (shouldResetModel) {
            setValue("model", ""); // Reset model when make changes
            setSelectedModelId(""); // Reset model ID
          }

          try {
            // Fetch models for the selected make
            const API_BASE_URL =
              import.meta.env.VITE_API_URL || "http://localhost:3000/api";
            const response = await fetch(
              `${API_BASE_URL}/metadata/makes/${selectedMakeId}/models`
            );
            const models = await response.json();
            // Filter out any null/undefined models and ensure they have required fields
            const validModels = Array.isArray(models) 
              ? models.filter((model: any) => 
                  model && 
                  model.id && 
                  (model.displayName || model.name)
                )
              : [];
            setAvailableModels(validModels);
          } catch (error) {
            console.error("Failed to fetch models:", error);
            setAvailableModels([]);
          }
        }
      } else {
        setAvailableModels([]);
        if (!listing) {
          setSelectedModelId("");
        }
      }
    };

    loadModels();
  }, [selectedMakeId, metadata, setValue, listing]);

  // Set model ID when models are loaded and listing exists
  useEffect(() => {
    if (listing && availableModels.length > 0 && selectedMakeId && !selectedModelId) {
      // Only set model if not already set
      const listingMake = listing.carDetail.make?.trim();
      const listingModel = listing.carDetail.model?.trim();
      const selectedMake = metadata?.makes?.find(m => m.id === selectedMakeId);
      
      if (selectedMake && (
        selectedMake.name?.toLowerCase() === listingMake?.toLowerCase() || 
        selectedMake.displayName?.toLowerCase() === listingMake?.toLowerCase()
      )) {
        const model = availableModels.find(
          (m) => 
            m.name?.toLowerCase() === listingModel?.toLowerCase() || 
            m.displayName?.toLowerCase() === listingModel?.toLowerCase()
        );
        
        if (model) {
          setSelectedModelId(model.id);
          setValue("model", model.name);
        }
      }
    }
  }, [availableModels, listing, selectedModelId, selectedMakeId, metadata, setValue]);

  // Handle form value changes
  const handleFormValueChange = (field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setValue(field as any, value);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (uploadedImages.length + files.length > 10) {
      toast.error(
        "📸 You can upload maximum 10 images per listing. Please remove some images first."
      );
      return;
    }

    const validFiles = files.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(
          `Image "${file.name}" is too large. Please choose an image smaller than 5MB.`
        );
        return false;
      }
      if (!file.type.match(/^image\/(jpeg|jpg|png|gif)$/)) {
        toast.error(
          `"${file.name}" is not a supported image format. Please use JPEG, PNG, or GIF.`
        );
        return false;
      }
      return true;
    });

    setUploadedImages((prev) => [...prev, ...validFiles]);
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (uploadedVideos.length + files.length > 2) {
      toast.error(
        "🎥 You can upload maximum 2 videos per listing. Please remove some videos first."
      );
      return;
    }

    const validFiles = files.filter((file) => {
      if (file.size > 100 * 1024 * 1024) {
        toast.error(
          `Video "${file.name}" is too large. Please choose a video smaller than 100MB.`
        );
        return false;
      }
      if (!file.type.match(/^video\/(mp4|webm|ogg|quicktime|x-msvideo)$/)) {
        toast.error(
          `"${file.name}" is not a supported video format. Please use MP4, WebM, OGG, MOV, or AVI.`
        );
        return false;
      }
      return true;
    });

    setUploadedVideos((prev) => [...prev, ...validFiles]);
  };

  const handleVideoRemove = (index: number) => {
    setUploadedVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteCurrentVideo = (index: number) => {
    setCurrentVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteCurrentImage = (index: number) => {
    setCurrentImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageReorder = (reorderedImages: any[]) => {
    // Separate current images and new uploaded images
    const currentImageItems = reorderedImages.filter(img => img.isExisting);
    const newImageItems = reorderedImages.filter(img => !img.isExisting);
    
    // Update current images
    const reorderedCurrentImages = currentImageItems.map(img => img.originalImage);
    setCurrentImages(reorderedCurrentImages);
    
    // Update uploaded images
    const reorderedUploadedImages = newImageItems.map(img => img.file).filter(Boolean) as File[];
    setUploadedImages(reorderedUploadedImages);
  };

  const handleImageRemove = (imageId: string) => {
    const index = parseInt(imageId);
    const allImages = [...currentImages.map((img, i) => ({ id: i.toString(), isExisting: true, originalImage: img })), 
                      ...uploadedImages.map((file, i) => ({ id: (currentImages.length + i).toString(), isExisting: false, file }))];
    
    const imageToRemove = allImages[index];
    if (imageToRemove.isExisting) {
      handleDeleteCurrentImage(index);
    } else {
      removeImage(index - currentImages.length);
    }
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const fetchListing = async (listingId: string) => {
    try {
      setLoading(true);
      const response = await ListingService.getListing(listingId);
      setListing(response);

      // Reset make and model selection when loading new listing
      setSelectedMakeId("");
      setSelectedModelId("");

      // Populate form
      setValue("title", response.title);
      setValue("description", response.description);
      setValue("price", response.price);
      setValue("priceType", response.priceType || "negotiable");
      setValue("location", response.location);
      setValue("city", response.city || "");
      setValue("state", response.state || "");
      setValue("country", response.country || "USA");
      
      // Set location data if coordinates exist
      if (response.latitude && response.longitude) {
        setLocationData({
          latitude: response.latitude,
          longitude: response.longitude,
          address: response.location || "",
          city: response.city,
          state: response.state,
          country: response.country,
        });
      }
      
      setValue("make", response.carDetail.make);
      setValue("model", response.carDetail.model);
      
      setValue("year", response.carDetail.year);
      setValue("bodyType", response.carDetail.bodyType);
      setValue("fuelType", response.carDetail.fuelType);
      setValue("transmission", response.carDetail.transmission);
      
      // Update formValues for EnhancedSelect components
      setFormValues((prev) => ({
        ...prev,
        bodyType: response.carDetail.bodyType || "",
        fuelType: response.carDetail.fuelType || "",
        transmission: response.carDetail.transmission || "",
        priceType: response.priceType || "negotiable",
        color: response.carDetail.color || "",
        condition: response.carDetail.condition || "",
        numberOfDoors: response.carDetail.numberOfDoors?.toString() || "",
        numberOfSeats: response.carDetail.numberOfSeats?.toString() || "",
      }));
      setValue("engineSize", response.carDetail.engineSize);
      setValue("enginePower", response.carDetail.enginePower);
      setValue("mileage", response.carDetail.mileage);
      setValue("color", response.carDetail.color);
      setValue("numberOfDoors", response.carDetail.numberOfDoors || 4);
      setValue("numberOfSeats", response.carDetail.numberOfSeats || 5);
      setValue("condition", response.carDetail.condition);
      setValue("vin", response.carDetail.vin || "");
      setValue(
        "registrationNumber",
        response.carDetail.registrationNumber || ""
      );
      setValue("previousOwners", response.carDetail.previousOwners || 0);
      setValue("carDescription", response.carDetail.description || "");
      setValue("features", response.carDetail.features || []);

      // Set features state
      setSelectedFeatures(response.carDetail.features || []);

      // Set current images for display
      if (response.carDetail.images && response.carDetail.images.length > 0) {
        setCurrentImages(response.carDetail.images);
      }

      // Set current videos for display
      if (response.carDetail.videos && response.carDetail.videos.length > 0) {
        setCurrentVideos(response.carDetail.videos);
      } else {
        setCurrentVideos([]);
      }
    } catch (error) {
      toast.error("Failed to load listing details");
      navigate("/profile");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: EditListingForm) => {
    if (!listing || !id) return;

    try {
      setIsUploading(true);

      // Upload new images if any
      let imageUrls: Array<{
        filename: string;
        url: string;
        originalName: string;
        fileSize: number;
        mimeType: string;
      }> = [];
      if (uploadedImages.length > 0) {
        const uploadResponse =
          await ListingService.uploadCarImages(uploadedImages);
        imageUrls = uploadResponse.images;
      }

      // Prepare images array with correct order (existing + new)
      const allImages = [
        ...currentImages.map((image, index) => ({
          filename: image.filename,
          originalName: image.originalName,
          url: image.url,
          type: image.type || (index === 0 ? "exterior" : "other"),
          alt: image.alt || `${data.make} ${data.model} image ${index + 1}`,
          fileSize: image.fileSize || 0,
          mimeType: image.mimeType || 'image/jpeg',
        })),
        ...imageUrls.map((img, index) => ({
          filename: img.filename,
          originalName: img.originalName,
          url: img.url,
          type: (currentImages.length + index) === 0 ? "exterior" : "other",
          alt: `${data.make} ${data.model} image ${currentImages.length + index + 1}`,
          fileSize: img.fileSize,
          mimeType: img.mimeType,
        })),
      ];

      // Upload new videos if any
      let videoUrls: Array<{
        filename: string;
        url: string;
        originalName: string;
        fileSize: number;
        mimeType: string;
      }> = [];
      if (uploadedVideos.length > 0) {
        const uploadResponse = await ListingService.uploadCarVideos(uploadedVideos);
        videoUrls = uploadResponse.videos;
      }

      // Prepare videos array (existing first, then new)
      const allVideos = [
        ...currentVideos.map((video, index) => ({
          filename: video.filename,
          originalName: video.originalName,
          url: video.url,
          alt: video.alt || `${data.make} ${data.model} video ${index + 1}`,
          fileSize: video.fileSize || 0,
          mimeType: video.mimeType || 'video/mp4',
        })),
        ...videoUrls.map((vid, index) => ({
          filename: vid.filename,
          originalName: vid.originalName,
          url: vid.url,
          alt: `${data.make} ${data.model} video ${currentVideos.length + index + 1}`,
          fileSize: vid.fileSize,
          mimeType: vid.mimeType,
        })),
      ];

      const updateData: Partial<CreateListingPayload> = {
        title: data.title,
        description: data.description,
        price: data.price,
        ...(data.priceType !== undefined && { priceType: data.priceType }),
        location: data.location,
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.country !== undefined && { country: data.country }),
        ...(locationData?.latitude !== undefined && { latitude: locationData.latitude }),
        ...(locationData?.longitude !== undefined && { longitude: locationData.longitude }),
        carDetail: {
          make: data.make,
          model: data.model,
          year: data.year,
          bodyType: data.bodyType,
          fuelType: data.fuelType,
          transmission: data.transmission,
          engineSize: data.engineSize,
          enginePower: data.enginePower,
          mileage: data.mileage,
          color: data.color,
          numberOfDoors: data.numberOfDoors || 4,
          numberOfSeats: data.numberOfSeats || 5,
          condition: data.condition,
          ...(data.vin !== undefined && { vin: data.vin }),
          ...(data.registrationNumber !== undefined && { registrationNumber: data.registrationNumber }),
          ...(data.previousOwners !== undefined && { previousOwners: data.previousOwners }),
          ...(data.carDescription !== undefined && { description: data.carDescription }),
          ...(selectedFeatures.length > 0 && { features: selectedFeatures }),
        },
        // Include all images and videos
        ...(allImages.length > 0 && { images: allImages }),
        ...(allVideos.length > 0 && { videos: allVideos }),
      };

      const response = await ListingService.updateListing(id, updateData);
      
      // Show appropriate success message based on backend response
      const meta = (response as any)?._metadata;
      const isOnlyImageReordering = meta?.imageChangeType === 'reorder-only' && meta?.hasSubstantiveChanges === false;
      
      if (isOnlyImageReordering) {
        toast.success(
          "✅ Your listing images have been updated successfully! Changes are now live."
        );
      } else {
        toast.success(
          "✅ Your listing has been updated successfully! It will be reviewed again by our team."
        );
      }
      
      navigate("/my-listings");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "We couldn't update your listing. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading || metadataLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-6">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-48 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Listing not found
          </h1>
          <Button onClick={() => navigate("/my-listings")}>
            Back to My Listings
          </Button>
        </div>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Failed to load form data
          </h1>
          <p className="text-gray-600 mb-4">
            Unable to load the required form options. Please try again.
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate("/my-listings")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Listings
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Listing</h1>
        <p className="text-gray-600">
          Update your listing details. Changes will require admin re-approval.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Listing Title
              </label>
              <Input
                id="title"
                {...register("title")}
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                {...register("description")}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.description ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="price"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Price ($)
                </label>
                <Input
                  id="price"
                  type="number"
                  {...register("price", { valueAsNumber: true })}
                  className={errors.price ? "border-red-500" : ""}
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.price.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="priceType"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Price Type
                </label>
                <EnhancedSelect
                  options={(metadata?.priceTypes || [])
                    .map((type) => ({
                      value: type.value,
                      label: type.displayValue,
                    }))}
                  value={formValues.priceType}
                  onValueChange={(value) =>
                    handleFormValueChange("priceType", value as string)
                  }
                  placeholder="Select price type"
                  searchable={true}
                  multiple={false}
                  error={!!errors.priceType}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <LocationPicker
                address={listing.location || ""}
                latitude={locationData?.latitude || listing.latitude || undefined}
                longitude={locationData?.longitude || listing.longitude || undefined}
                onLocationChange={(location) => {
                  setLocationData(location);
                  setValue("location", location.address);
                  if (location.city) setValue("city", location.city);
                  if (location.state) setValue("state", location.state);
                  if (location.country) setValue("country", location.country);
                }}
                height="300px"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.location.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Car Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Car className="w-5 h-5 mr-2" />
              Car Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label
                  htmlFor="make"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Make
                </label>
                <EnhancedSelect
                  options={
                    metadata?.makes?.map((make) => ({
                      value: make.id,
                      label: make.displayName,
                    })) || []
                  }
                  value={selectedMakeId}
                  onValueChange={(value) => {
                    setSelectedMakeId(value as string);
                  }}
                  placeholder="Select a make"
                  searchable={true}
                  multiple={false}
                  error={!!errors.make}
                />
                {errors.make && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.make.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="model"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Model
                </label>
                <EnhancedSelect
                  key={`model-select-${selectedMakeId}-${availableModels.length}`}
                  options={availableModels
                    .filter((model) => model && model.id && (model.displayName || model.name))
                    .map((model) => ({
                      value: model.id,
                      label: model.displayName || model.name || "Unknown Model",
                    }))}
                  value={selectedModelId || ""}
                  onValueChange={(value) => {
                    const selectedModel = availableModels.find(
                      (model) => model && model.id === value
                    );
                    if (selectedModel) {
                      setSelectedModelId(value as string);
                      setValue("model", selectedModel.name);
                      // Auto-set body type if available
                      if (selectedModel.defaultBodyStyle) {
                        setValue("bodyType", selectedModel.defaultBodyStyle);
                      }
                    }
                  }}
                  placeholder="Select a model"
                  searchable={true}
                  multiple={false}
                  error={!!errors.model}
                />
                {errors.model && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.model.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="year"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Year
                </label>
                <Input
                  id="year"
                  type="number"
                  {...register("year", { valueAsNumber: true })}
                  className={errors.year ? "border-red-500" : ""}
                />
                {errors.year && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.year.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label
                  htmlFor="bodyType"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Body Type
                </label>
                <EnhancedSelect
                  options={
                    metadata?.bodyTypes?.map((type) => ({
                      value: type.value,
                      label: type.displayValue,
                    })) || []
                  }
                  value={formValues.bodyType}
                  onValueChange={(value) =>
                    handleFormValueChange("bodyType", value as string)
                  }
                  placeholder="Select body type"
                  searchable={true}
                  multiple={false}
                  error={!!errors.bodyType}
                />
                {errors.bodyType && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.bodyType.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="fuelType"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Fuel Type
                </label>
                <EnhancedSelect
                  options={
                    metadata?.fuelTypes?.map((fuelType) => ({
                      value: fuelType.value,
                      label: fuelType.displayValue,
                    })) || []
                  }
                  value={formValues.fuelType}
                  onValueChange={(value) =>
                    handleFormValueChange("fuelType", value as string)
                  }
                  placeholder="Select fuel type"
                  searchable={true}
                  multiple={false}
                  error={!!errors.fuelType}
                />
                {errors.fuelType && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.fuelType.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="transmission"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Transmission
                </label>
                <EnhancedSelect
                  options={
                    metadata?.transmissionTypes?.map((transmission) => ({
                      value: transmission.value,
                      label: transmission.displayValue,
                    })) || []
                  }
                  value={formValues.transmission}
                  onValueChange={(value) =>
                    handleFormValueChange("transmission", value as string)
                  }
                  placeholder="Select transmission"
                  searchable={true}
                  multiple={false}
                  error={!!errors.transmission}
                />
                {errors.transmission && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.transmission.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label
                  htmlFor="engineSize"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Engine Size (L)
                </label>
                <Input
                  id="engineSize"
                  type="number"
                  step="0.1"
                  {...register("engineSize", { valueAsNumber: true })}
                  className={errors.engineSize ? "border-red-500" : ""}
                />
                {errors.engineSize && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.engineSize.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="enginePower"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Engine Power (HP)
                </label>
                <Input
                  id="enginePower"
                  type="number"
                  {...register("enginePower", { valueAsNumber: true })}
                  className={errors.enginePower ? "border-red-500" : ""}
                />
                {errors.enginePower && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.enginePower.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="mileage"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Mileage (miles)
                </label>
                <Input
                  id="mileage"
                  type="number"
                  {...register("mileage", { valueAsNumber: true })}
                  className={errors.mileage ? "border-red-500" : ""}
                />
                {errors.mileage && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.mileage.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label
                  htmlFor="color"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Color
                </label>
                <EnhancedSelect
                  options={
                    metadata?.colors?.map((color) => ({
                      value: color.value,
                      label: color.displayValue,
                    })) || []
                  }
                  value={formValues.color}
                  onValueChange={(value) =>
                    handleFormValueChange("color", value as string)
                  }
                  placeholder="Select color"
                  searchable={true}
                  multiple={false}
                  error={!!errors.color}
                />
                {errors.color && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.color.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="numberOfDoors"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Number of Doors
                </label>
                <EnhancedSelect
                  options={[
                    { value: "2", label: "2 Doors" },
                    { value: "3", label: "3 Doors" },
                    { value: "4", label: "4 Doors" },
                    { value: "5", label: "5 Doors" },
                    { value: "6", label: "6 Doors" },
                  ]}
                  value={formValues.numberOfDoors || ""}
                  onValueChange={(value) => {
                    const numValue = parseInt(value as string);
                    setValue("numberOfDoors", numValue);
                    setFormValues((prev) => ({ ...prev, numberOfDoors: value as string }));
                  }}
                  placeholder="Select number of doors"
                  searchable={false}
                  multiple={false}
                  error={!!errors.numberOfDoors}
                />
                {errors.numberOfDoors && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.numberOfDoors.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="numberOfSeats"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Number of Seats
                </label>
                <EnhancedSelect
                  options={[
                    { value: "2", label: "2 Seats" },
                    { value: "4", label: "4 Seats" },
                    { value: "5", label: "5 Seats" },
                    { value: "6", label: "6 Seats" },
                    { value: "7", label: "7 Seats" },
                    { value: "8", label: "8 Seats" },
                    { value: "9", label: "9 Seats" },
                  ]}
                  value={formValues.numberOfSeats || ""}
                  onValueChange={(value) => {
                    const numValue = parseInt(value as string);
                    setValue("numberOfSeats", numValue);
                    setFormValues((prev) => ({ ...prev, numberOfSeats: value as string }));
                  }}
                  placeholder="Select number of seats"
                  searchable={false}
                  multiple={false}
                  error={!!errors.numberOfSeats}
                />
                {errors.numberOfSeats && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.numberOfSeats.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="condition"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Condition
              </label>
              <EnhancedSelect
                options={
                  metadata?.conditions?.map((condition) => ({
                    value: condition.value,
                    label: condition.displayValue,
                  })) || []
                }
                value={formValues.condition}
                onValueChange={(value) =>
                  handleFormValueChange("condition", value as string)
                }
                placeholder="Select condition"
                searchable={true}
                multiple={false}
                error={!!errors.condition}
              />
              {errors.condition && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.condition.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Additional Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="vin"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  VIN (Optional)
                </label>
                <Input
                  id="vin"
                  {...register("vin")}
                  placeholder="Vehicle Identification Number"
                />
              </div>

              <div>
                <label
                  htmlFor="registrationNumber"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Registration Number (Optional)
                </label>
                <Input
                  id="registrationNumber"
                  {...register("registrationNumber")}
                  placeholder="License plate number"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="previousOwners"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Previous Owners
              </label>
              <Input
                id="previousOwners"
                type="number"
                min="0"
                {...register("previousOwners", { valueAsNumber: true })}
                placeholder="Number of previous owners"
              />
            </div>

            <div>
              <label
                htmlFor="carDescription"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Car Description (Optional)
              </label>
              <textarea
                id="carDescription"
                {...register("carDescription")}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional details about the car..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Car Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Car className="w-5 h-5 mr-2" />
              Car Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(metadata?.carFeatures || []).map((feature) => (
                <label
                  key={feature.id}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFeatures.includes(feature.value)}
                    onChange={() => toggleFeature(feature.value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {feature.displayValue}
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Image Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Car Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Combined Images Gallery */}
              {(currentImages.length > 0 || uploadedImages.length > 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Car Images
                  </label>
                  <DraggableImageGallery
                    images={[
                      ...currentImages.map((image, index) => ({
                        id: index.toString(),
                        src: `${SOCKET_URL}${image.url}`,
                        isExisting: true,
                        originalImage: image,
                      })),
                      ...uploadedImages.map((file, index) => ({
                        id: (currentImages.length + index).toString(),
                        src: URL.createObjectURL(file),
                        file: file,
                        isExisting: false,
                      })),
                    ]}
                    onReorder={handleImageReorder}
                    onRemove={handleImageRemove}
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="images"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Upload New Images (Optional)
                </label>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="images"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 5MB each (max 10 images)
                      </p>
                    </div>
                    <input
                      id="images"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Video className="w-5 h-5 mr-2" />
              Car Videos (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(currentVideos.length > 0 || uploadedVideos.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentVideos.map((video, index) => (
                    <div
                      key={`existing-${index}`}
                      className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200"
                    >
                      <video
                        src={`${SOCKET_URL}${video.url}`}
                        className="w-full h-full object-cover"
                        controls={false}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteCurrentVideo(index)}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        {video.originalName || `Video ${index + 1}`}
                      </div>
                    </div>
                  ))}
                  {uploadedVideos.map((file, index) => (
                    <div
                      key={`new-${index}`}
                      className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200"
                    >
                      <video
                        src={URL.createObjectURL(file)}
                        className="w-full h-full object-cover"
                        controls={false}
                      />
                      <button
                        type="button"
                        onClick={() => handleVideoRemove(index)}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        {file.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label
                  htmlFor="videos"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Upload New Videos (Optional)
                </label>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="videos"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Video className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        MP4, WebM, OGG, MOV, AVI up to 100MB each (max 2 videos)
                      </p>
                    </div>
                    <input
                      id="videos"
                      type="file"
                      multiple
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/my-listings")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSubmitting || isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {isUploading ? "Uploading..." : "Updating..."}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Update Listing
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
