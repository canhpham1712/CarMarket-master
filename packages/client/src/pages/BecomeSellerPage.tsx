import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Car,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Shield,
  Users,
  ArrowRight,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { useAuthStore } from "../store/auth";
import { usePermissions } from "../hooks/usePermissions";

export function BecomeSellerPage() {
  const navigate = useNavigate();
  const { becomeSeller, isLoading, user } = useAuthStore();
  const { hasRole, hasPermission } = usePermissions();
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Check if user already has seller role
  const isAlreadySeller = hasRole("seller") || hasPermission("listing:create");

  useEffect(() => {
    if (isAlreadySeller) {
      toast.success("You're already a seller!");
      navigate("/sell-car", { replace: true });
    }
  }, [isAlreadySeller, navigate]);

  const handleBecomeSeller = async () => {
    try {
      setIsUpgrading(true);
      await becomeSeller();
      toast.success(
        "🎉 Congratulations! You're now a seller. You can start listing your cars!"
      );
      // Redirect to sell car page
      navigate("/sell-car");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to upgrade to seller. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsUpgrading(false);
    }
  };

  if (isAlreadySeller) {
    return null; // Will redirect via useEffect
  }

  const benefits = [
    {
      icon: Car,
      title: "List Your Cars",
      description: "Create detailed listings for your vehicles with photos and specifications",
    },
    {
      icon: TrendingUp,
      title: "Reach More Buyers",
      description: "Get your listings seen by thousands of potential buyers",
    },
    {
      icon: DollarSign,
      title: "Manage Sales",
      description: "Track inquiries, manage transactions, and grow your business",
    },
    {
      icon: Shield,
      title: "Build Trust",
      description: "Get verified and build your seller reputation with ratings",
    },
    {
      icon: Users,
      title: "Connect with Buyers",
      description: "Communicate directly with interested buyers through our messaging system",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Car className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Become a Seller on CarMarket
          </h1>
          <p className="text-lg text-gray-600">
            Start selling your cars and reach thousands of potential buyers
          </p>
        </div>

        {/* Benefits Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Why Become a Seller?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center mb-2">
                      <Icon className="h-6 w-6 text-blue-600 mr-2" />
                      <CardTitle className="text-lg">{benefit.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{benefit.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Upgrade Card */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              Ready to Start Selling?
            </CardTitle>
            <CardDescription className="text-center text-base">
              Upgrade your account to seller status and unlock all selling features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center text-gray-700">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span>Create unlimited car listings</span>
              </div>
              <div className="flex items-center text-gray-700">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span>Manage your listings and sales</span>
              </div>
              <div className="flex items-center text-gray-700">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span>Connect with buyers directly</span>
              </div>
              <div className="flex items-center text-gray-700">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span>Access seller dashboard and analytics</span>
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleBecomeSeller}
                disabled={isUpgrading || isLoading}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 text-lg py-6"
                size="lg"
              >
                {isUpgrading || isLoading ? (
                  "Upgrading..."
                ) : (
                  <>
                    Become a Seller
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>

            <p className="text-sm text-gray-500 text-center mt-4">
              This upgrade is free and instant. You can start listing cars immediately
              after upgrading.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

