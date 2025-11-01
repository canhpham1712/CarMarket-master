import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Car,
  Upload,
  MapPin,
  DollarSign,
  FileText,
  Camera,
  Plus,
  Video,
  X,
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
import { ListingService } from "../services/listing.service";
import { useMetadata } from "../services/metadata.service";
import { DraggableImageGallery } from "../components/DraggableImageGallery";

const listingSchema = z.object({
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

type ListingForm = z.infer<typeof listingSchema>;

export function SellCarPage() {
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<File[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMakeId, setSelectedMakeId] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [formValues, setFormValues] = useState({
    priceType: "",
    bodyType: "",
    fuelType: "",
    transmission: "",
    color: "",
    condition: "",
  });
  const navigate = useNavigate();
  const { metadata, loading: metadataLoading, error: metadataError } = useMetadata();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<ListingForm>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      numberOfDoors: 4,
      numberOfSeats: 5,
      priceType: "negotiable",
      country: "USA",
    },
  });

  const currentModel = watch("model");

  // Load models when make is selected
  useEffect(() => {
    const loadModels = async () => {
      if (selectedMakeId && metadata?.makes) {
        const selectedMake = metadata.makes.find(
          (make) => make.id === selectedMakeId
        );
        if (selectedMake) {
          setValue("make", selectedMake.name);
          setValue("model", ""); // Reset model when make changes

          try {
            // Fetch models for the selected make
            const API_BASE_URL =
              import.meta.env.VITE_API_URL || "http://localhost:3000/api";
            const response = await fetch(
              `${API_BASE_URL}/metadata/makes/${selectedMakeId}/models`
            );
            const models = await response.json();
            setAvailableModels(models);
          } catch (error) {
            console.error("Failed to fetch models:", error);
            setAvailableModels([]);
          }
        }
      } else {
        setAvailableModels([]);
      }
    };

    loadModels();
  }, [selectedMakeId, metadata, setValue]);

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

  const handleImageReorder = (reorderedImages: any[]) => {
    const files = reorderedImages.map(img => img.file).filter(Boolean) as File[];
    setUploadedImages(files);
  };

  const handleImageRemove = (imageId: string) => {
    const index = parseInt(imageId);
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
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

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const onSubmit = async (data: ListingForm) => {
    try {
      setIsUploading(true);

      // Upload images first if any
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

      // Upload videos if any
      let videoUrls: Array<{
        filename: string;
        url: string;
        originalName: string;
        fileSize: number;
        mimeType: string;
      }> = [];
      if (uploadedVideos.length > 0) {
        const uploadResponse =
          await ListingService.uploadCarVideos(uploadedVideos);
        videoUrls = uploadResponse.videos;
      }

      // Prepare listing data
      const priceType: string = data.priceType ?? "negotiable";
      const listingData = {
        title: data.title,
        description: data.description,
        price: data.price,
        priceType,
        location: data.location,
        city: data.city || "",
        state: data.state || "",
        country: data.country || "USA",
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
          vin: data.vin || "",
          registrationNumber: data.registrationNumber || "",
          previousOwners: data.previousOwners ?? 0,
          description: data.carDescription || "",
          features: selectedFeatures,
        },
        images: imageUrls.map((img, index) => ({
          filename: img.filename,
          originalName: img.originalName,
          url: img.url,
          type: index === 0 ? "exterior" : "other",
          alt: `${data.make} ${data.model} image ${index + 1}`,
          fileSize: img.fileSize,
          mimeType: img.mimeType,
        })),
        videos: videoUrls.map((vid, index) => ({
          filename: vid.filename,
          originalName: vid.originalName,
          url: vid.url,
          alt: `${data.make} ${data.model} video ${index + 1}`,
          fileSize: vid.fileSize,
          mimeType: vid.mimeType,
        })),
      };

      const newListing = await ListingService.createListing(listingData);

      toast.success(
        "🎉 Your car listing has been created successfully! Our team will review it within 24 hours."
      );
      navigate(`/cars/${newListing.id}`);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "We couldn't create your listing right now. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  if (metadataLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-6">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-48 bg-gray-200 rounded-lg"></div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
          </div>
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
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sell Your Car</h1>
        <p className="text-gray-600">
          Create a detailed listing to attract potential buyers
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
                placeholder="e.g., 2020 Toyota Camry LE - Low Mileage, Excellent Condition"
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
                placeholder="Provide detailed information about your car's condition, maintenance history, and any special features..."
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
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="price"
                    type="number"
                    {...register("price", { valueAsNumber: true })}
                    placeholder="25000"
                    className={`pl-10 ${errors.price ? "border-red-500" : ""}`}
                  />
                </div>
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
                    .filter((type) => type && type.value !== null && type.value !== undefined && String(type.value).trim() !== "")
                    .map((type) => ({
                      value: String(type.value),
                      label: type.displayValue || String(type.value),
                    }))}
                  value={formValues.priceType}
                  onValueChange={(value) =>
                    handleFormValueChange("priceType", value as string)
                  }
                  placeholder={
                    metadataLoading
                      ? "Loading price types..."
                      : metadata?.priceTypes?.length === 0
                        ? "No price types available"
                        : "Select price type"
                  }
                  searchable={true}
                  multiple={false}
                  error={!!errors.priceType}
                />
                {errors.priceType && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.priceType.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="location"
                    {...register("location")}
                    placeholder="New York, NY"
                    className={`pl-10 ${errors.location ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.location && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.location.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  City
                </label>
                <Input id="city" {...register("city")} placeholder="New York" />
              </div>

              <div>
                <label
                  htmlFor="state"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  State
                </label>
                <Input id="state" {...register("state")} placeholder="NY" />
              </div>
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
                      label: make.displayName || make.name,
                    })) || []
                  }
                  value={selectedMakeId}
                  onValueChange={(value) => {
                    setSelectedMakeId(value as string);
                  }}
                  placeholder={
                    metadataLoading
                      ? "Loading makes..."
                      : metadata?.makes?.length === 0
                        ? "No makes available"
                        : "Select a make"
                  }
                  searchable={true}
                  multiple={false}
                  error={!!errors.make}
                />
                {metadataError && (
                  <p className="mt-1 text-xs text-red-600">{metadataError}</p>
                )}
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
                  value={
                    availableModels.find((m) => m.name === currentModel)?.id || ""
                  }
                  options={availableModels.map((model) => ({
                    value: model.id,
                    label: model.displayName || model.name,
                  }))}
                  onValueChange={(value) => {
                    const selectedModel = availableModels.find(
                      (model) => model.id === value
                    );
                    if (selectedModel) {
                      setValue("model", selectedModel.name);
                      // Auto-set body type if available
                      if (selectedModel.defaultBodyStyle) {
                        setValue("bodyType", selectedModel.defaultBodyStyle);
                      }
                    }
                  }}
                  placeholder={
                    selectedMakeId && availableModels.length === 0
                      ? "Loading models..."
                      : selectedMakeId
                        ? "Select a model"
                        : "Select make first"
                  }
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
                  placeholder="2020"
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
                      label: type.displayValue || type.value,
                    })) || []
                  }
                  value={formValues.bodyType}
                  onValueChange={(value) =>
                    handleFormValueChange("bodyType", value as string)
                  }
                  placeholder={
                    metadataLoading
                      ? "Loading body types..."
                      : metadata?.bodyTypes?.length === 0
                        ? "No body types available"
                        : "Select body type"
                  }
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
                    metadata?.fuelTypes?.map((type) => ({
                      value: type.value,
                      label: type.displayValue || type.value,
                    })) || []
                  }
                  value={formValues.fuelType}
                  onValueChange={(value) =>
                    handleFormValueChange("fuelType", value as string)
                  }
                  placeholder={
                    metadataLoading
                      ? "Loading fuel types..."
                      : metadata?.fuelTypes?.length === 0
                        ? "No fuel types available"
                        : "Select fuel type"
                  }
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
                    metadata?.transmissionTypes?.map((type) => ({
                      value: type.value,
                      label: type.displayValue || type.value,
                    })) || []
                  }
                  value={formValues.transmission}
                  onValueChange={(value) =>
                    handleFormValueChange("transmission", value as string)
                  }
                  placeholder={
                    metadataLoading
                      ? "Loading transmissions..."
                      : metadata?.transmissionTypes?.length === 0
                        ? "No transmissions available"
                        : "Select transmission"
                  }
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  placeholder="2.4"
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
                  placeholder="200"
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
                  placeholder="50000"
                  className={errors.mileage ? "border-red-500" : ""}
                />
                {errors.mileage && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.mileage.message}
                  </p>
                )}
              </div>

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
                      label: color.displayValue || color.value,
                    })) || []
                  }
                  value={formValues.color}
                  onValueChange={(value) =>
                    handleFormValueChange("color", value as string)
                  }
                  placeholder={
                    metadataLoading
                      ? "Loading colors..."
                      : metadata?.colors?.length === 0
                        ? "No colors available"
                        : "Select color"
                  }
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      label: condition.displayValue || condition.value,
                    })) || []
                  }
                  value={formValues.condition}
                  onValueChange={(value) =>
                    handleFormValueChange("condition", value as string)
                  }
                  placeholder={
                    metadataLoading
                      ? "Loading conditions..."
                      : metadata?.conditions?.length === 0
                        ? "No conditions available"
                        : "Select condition"
                  }
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

              <div>
                <label
                  htmlFor="numberOfDoors"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Number of Doors
                </label>
                <Input
                  id="numberOfDoors"
                  type="number"
                  min="2"
                  max="6"
                  {...register("numberOfDoors", { valueAsNumber: true })}
                  placeholder="4"
                />
              </div>

              <div>
                <label
                  htmlFor="numberOfSeats"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Number of Seats
                </label>
                <Input
                  id="numberOfSeats"
                  type="number"
                  min="2"
                  max="9"
                  {...register("numberOfSeats", { valueAsNumber: true })}
                  placeholder="5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  placeholder="1HGBH41JXMN109186"
                />
              </div>

              <div>
                <label
                  htmlFor="registrationNumber"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Registration Number
                </label>
                <Input
                  id="registrationNumber"
                  {...register("registrationNumber")}
                  placeholder="ABC-1234"
                />
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
                  placeholder="1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Car Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Car Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <Upload className="w-12 h-12 text-gray-400" />
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600 hover:text-blue-500">
                      Click to upload
                    </span>{" "}
                    or drag and drop
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB each (Max 10 images)
                  </p>
                </label>
              </div>

              {uploadedImages.length > 0 && (
                <DraggableImageGallery
                  images={uploadedImages.map((file, index) => ({
                    id: index.toString(),
                    src: URL.createObjectURL(file),
                    file: file,
                  }))}
                  onReorder={handleImageReorder}
                  onRemove={handleImageRemove}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Car Videos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Video className="w-5 h-5 mr-2" />
              Car Videos (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                  id="video-upload"
                />
                <label
                  htmlFor="video-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <Video className="w-12 h-12 text-gray-400" />
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600 hover:text-blue-500">
                      Click to upload
                    </span>{" "}
                    or drag and drop
                  </div>
                  <p className="text-xs text-gray-500">
                    MP4, WebM, OGG, MOV, AVI up to 100MB each (Max 2 videos)
                  </p>
                </label>
              </div>

              {uploadedVideos.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {uploadedVideos.map((file, index) => (
                    <div
                      key={index}
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
            </div>
          </CardContent>
        </Card>

        {/* Car Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Car Description (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label
                htmlFor="carDescription"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Additional Car Details
              </label>
              <textarea
                id="carDescription"
                {...register("carDescription")}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe any additional details about the car's condition, history, modifications, or special features..."
              />
              {errors.carDescription && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.carDescription.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Car Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Features & Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {metadata.carFeatures.map((feature) => (
                <label
                  key={feature.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedFeatures.includes(feature.value)
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFeatures.includes(feature.value)}
                    onChange={() => toggleFeature(feature.value)}
                    className="sr-only"
                  />
                  <span className="text-sm">{feature.displayValue}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
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
                Creating Listing...
              </>
            ) : (
              <>
                <Car className="w-4 h-4 mr-2" />
                Create Listing
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
