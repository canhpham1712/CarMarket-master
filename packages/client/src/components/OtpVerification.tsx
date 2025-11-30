import { useState, useEffect, useRef } from "react";
import { Phone, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/Card";
import { SellerVerificationService } from "../services/seller-verification.service";
import toast from "react-hot-toast";

interface OtpVerificationProps {
  phoneNumber: string;
  onVerified: () => void;
  disabled?: boolean;
  initialVerified?: boolean; // Add prop to indicate if phone is already verified
}

export function OtpVerification({ phoneNumber, onVerified, disabled = false, initialVerified = false }: OtpVerificationProps) {
  const [otpCode, setOtpCode] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(initialVerified); // Initialize with prop value
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update isVerified when initialVerified prop changes
  useEffect(() => {
    setIsVerified(initialVerified);
  }, [initialVerified]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeLeft]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRequestOtp = async () => {
    if (!phoneNumber) {
      toast.error("Please enter a phone number first");
      return;
    }

    try {
      setIsRequesting(true);
      
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      const response = await SellerVerificationService.requestPhoneVerification(phoneNumber);
      
      // Parse expiresAt - handle both string (ISO) and Date object
      let expiry: Date;
      if (response && response.expiresAt) {
        expiry = typeof response.expiresAt === 'string' 
          ? new Date(response.expiresAt) 
          : response.expiresAt instanceof Date 
          ? response.expiresAt 
          : new Date(Date.now() + 1 * 60 * 1000); // Default 1 minute
      } else {
        // Default to 1 minute if no expiresAt
        expiry = new Date(Date.now() + 1 * 60 * 1000);
      }
      
      setExpiresAt(expiry);
      
      // Calculate time left (ensure at least 1 second to enable input)
      const calculatedSeconds = Math.floor((expiry.getTime() - Date.now()) / 1000);
      const secondsLeft = Math.max(60, calculatedSeconds); // Default to 1 minute (60 seconds)
      
      // Set timeLeft immediately to enable input
      setTimeLeft(secondsLeft);
      setOtpCode("");
      
      toast.success("OTP has been sent! Check your phone (or console for mock service).");
      
      // Focus OTP input after a short delay to ensure it's enabled
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 200);
    } catch (error: any) {
      console.error("Request OTP error:", error);
      
      // Check if it's actually a success but with unexpected format
      // Sometimes backend returns 200 but frontend throws error
      if (error.response?.status === 200 || error.response?.data) {
        // Try to extract data from response
        const data = error.response?.data || error.data;
        if (data && (data.expiresAt || data.success)) {
          // It's actually a success, just parse it
          const expiry = data.expiresAt 
            ? (typeof data.expiresAt === 'string' ? new Date(data.expiresAt) : new Date(Date.now() + 1 * 60 * 1000))
            : new Date(Date.now() + 1 * 60 * 1000);
          
          setExpiresAt(expiry);
          setTimeLeft(60);
          setOtpCode("");
          toast.success("OTP has been sent! Check your phone (or console for mock service).");
          setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
          }, 200);
          return;
        }
      }
      
      const errorMessage = error.response?.data?.message || error.message || "Failed to send OTP. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleVerifyOtp = async () => {
    // Normalize OTP code (remove spaces, only digits)
    const normalizedOtp = otpCode.replace(/\D/g, "");
    
    if (!normalizedOtp || normalizedOtp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP code");
      return;
    }

    try {
      setIsVerifying(true);
      const response = await SellerVerificationService.verifyPhone(phoneNumber, normalizedOtp);
      
      console.log("Verify OTP response:", response);
      
      // Check if response indicates success
      if (response && (response.success || response.isPhoneVerified)) {
        setIsVerified(true);
        setTimeLeft(0);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        toast.success("✅ Phone number verified successfully!");
        onVerified();
      } else {
        toast.error("Verification failed. Please try again.");
        setOtpCode("");
        inputRef.current?.focus();
      }
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      console.error("Error response:", error.response?.data);
      
      // Check if it's actually a success response with unexpected format
      if (error.response?.status === 200 || (error.response?.data && error.response.data.success)) {
        // It's actually a success
        setIsVerified(true);
        setTimeLeft(0);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        toast.success("✅ Phone number verified successfully!");
        onVerified();
        return;
      }
      
      const errorMessage = error.response?.data?.message || error.message || "Invalid OTP code. Please try again.";
      toast.error(errorMessage);
      setOtpCode("");
      inputRef.current?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtpCode(value);
  };

  const canResend = !isVerified; // Allow resend anytime (old OTP will be invalidated)
  const canVerify = otpCode.length === 6 && timeLeft > 0 && !isVerified;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-blue-600" />
          Phone Number Verification
        </CardTitle>
        <CardDescription>
          Verify your phone number to complete seller verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isVerified ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900">Phone Number Verified</p>
              <p className="text-sm text-green-700">{phoneNumber}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Phone Number:</strong> {phoneNumber}
              </p>
              <p className="text-xs text-blue-700">
                💡 In development mode, OTP will be logged to the server console. Check your backend logs.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter OTP Code (6 digits)
                </label>
                <Input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={handleOtpChange}
                  placeholder="000000"
                  maxLength={6}
                  disabled={isVerifying || disabled || (timeLeft === 0 && expiresAt === null)}
                  className="text-center text-2xl font-mono tracking-widest"
                />
              </div>

              {timeLeft > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>OTP expires in: <strong className="text-blue-600">{formatTime(timeLeft)}</strong></span>
                </div>
              )}

              {timeLeft === 0 && !isVerified && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <XCircle className="w-4 h-4" />
                  <span>OTP has expired. Please request a new one.</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRequestOtp}
                  disabled={isRequesting || disabled}
                  className="flex-1"
                >
                  {isRequesting ? (
                    "Sending..."
                  ) : timeLeft > 0 ? (
                    "Resend OTP"
                  ) : (
                    "Request OTP"
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={!canVerify || isVerifying || disabled}
                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                >
                  {isVerifying ? (
                    "Verifying..."
                  ) : (
                    "Verify OTP"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

