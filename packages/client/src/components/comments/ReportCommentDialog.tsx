import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { CommentService } from '../../services/comment.service';
import type { ReportCommentRequest } from '../../types/comment.types';
import toast from 'react-hot-toast';

interface ReportCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commentId: string;
  onSuccess?: () => void;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'offensive', label: 'Offensive (Xúc phạm)' },
  { value: 'inappropriate', label: 'Inappropriate (Không phù hợp)' },
  { value: 'harassment', label: 'Harassment (Quấy rối)' },
  { value: 'other', label: 'Other (Khác)' },
] as const;

const MAX_DESCRIPTION_LENGTH = 500;

export function ReportCommentDialog({
  open,
  onOpenChange,
  commentId,
  onSuccess,
}: ReportCommentDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validate reason is selected
    if (!selectedReason) {
      toast.error('Please select a reason for reporting');
      return;
    }

    setIsSubmitting(true);

    try {
      const reportData: ReportCommentRequest = {
        reason: selectedReason as ReportCommentRequest['reason'],
        ...(description.trim() && { description: description.trim() }),
      };

      await CommentService.reportComment(commentId, reportData);

      toast.success('Comment reported successfully. Thank you for helping keep our community safe.');
      
      // Reset form
      setSelectedReason('');
      setDescription('');
      
      // Close dialog
      onOpenChange(false);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      // Handle specific error cases
      if (error?.response?.status === 409) {
        toast.error('You have already reported this comment');
      } else if (error?.response?.status === 404) {
        toast.error('Comment not found');
      } else if (error?.response?.status === 400) {
        const errorMessage = error?.response?.data?.message || 'Cannot report this comment';
        toast.error(errorMessage);
      } else {
        toast.error(error?.response?.data?.message || 'Failed to report comment. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason('');
      setDescription('');
      onOpenChange(false);
    }
  };

  const remainingChars = MAX_DESCRIPTION_LENGTH - description.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Comment</DialogTitle>
          <DialogDescription>
            Help us keep the community safe by reporting inappropriate content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason Selection */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              Reason for reporting <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className="flex items-center space-x-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700">{reason.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Description Textarea */}
          <div>
            <label htmlFor="report-description" className="text-sm font-medium text-gray-900 mb-2 block">
              Additional details (optional)
            </label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => {
                if (e.target.value.length <= MAX_DESCRIPTION_LENGTH) {
                  setDescription(e.target.value);
                }
              }}
              placeholder="Please provide any additional information that might help us understand the issue..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              disabled={isSubmitting}
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">
                {remainingChars} characters remaining
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

