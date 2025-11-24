import { useState } from "react";
import { Phone, MessageCircle, Mail, Star } from "lucide-react";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/Dialog";
import { ChatService } from "../../services/chat.service";
import { useAuthStore } from "../../store/auth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import type { User, RatingStats } from "../../types";

interface QuickContactCardProps {
  seller: User;
  ratingStats?: RatingStats | null;
  listingId?: string; // Optional: if contacting from a specific listing
  className?: string;
}

export function QuickContactCard({
  seller,
  ratingStats,
  listingId,
  className = "",
}: QuickContactCardProps) {
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isOwnProfile = currentUser?.id === seller.id;

  const handleCall = () => {
    if (seller.phoneNumber) {
      window.open(`tel:${seller.phoneNumber}`);
      setShowPhoneDialog(false);
    }
  };

  const handleMessage = async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to send messages");
      navigate("/login");
      return;
    }

    if (isOwnProfile) {
      toast.error("You cannot message yourself");
      return;
    }

    setIsLoading(true);
    try {
      if (listingId) {
        const response = await ChatService.startConversation(listingId);
        toast.success("Conversation started!");
        navigate(`/chat/${response.conversation.id}`);
      } else {
        // Navigate to conversations and let user select/create
        navigate("/conversations");
        toast.success("Navigate to conversations to message this seller");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to start conversation";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmail = () => {
    if (seller.email) {
      window.open(`mailto:${seller.email}`);
    }
  };

  if (isOwnProfile) {
    return null;
  }

  return (
    <>
      <Card className={`sticky top-4 transition-all duration-200 hover:shadow-lg ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Contact Seller</CardTitle>
          {ratingStats && ratingStats.totalRatings > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-semibold text-gray-900">
                {ratingStats.averageRating.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500">
                ({ratingStats.totalRatings}{" "}
                {ratingStats.totalRatings === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {seller.phoneNumber && (
            <Button
              className="w-full bg-green-600 text-white hover:bg-green-700 transition-all duration-200 transform hover:scale-[1.02]"
              onClick={() => setShowPhoneDialog(true)}
            >
              <Phone className="w-4 h-4 mr-2" />
              Call Seller
            </Button>
          )}

          <Button
            className="w-full bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 transform hover:scale-[1.02]"
            onClick={handleMessage}
            disabled={isLoading}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {isLoading ? "Starting..." : "Send Message"}
          </Button>

          {seller.email && (
            <Button
              variant="outline"
              className="w-full transition-all duration-200 hover:bg-gray-50"
              onClick={handleEmail}
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          )}

          {seller.location && (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Location</p>
              <p className="text-sm font-medium text-gray-900">
                {seller.location}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phone Number Dialog */}
      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Seller</DialogTitle>
            <DialogDescription>
              {seller.firstName} {seller.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center space-x-2">
                <Phone className="w-5 h-5 text-blue-600" />
                <span className="text-xl font-mono font-semibold text-gray-900">
                  {seller.phoneNumber}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowPhoneDialog(false)}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              onClick={handleCall}
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
            >
              Call Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

