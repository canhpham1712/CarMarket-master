import { useState, useEffect } from 'react';
import { User, DollarSign, CreditCard, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { ListingService } from '../../services/listing.service';
import type { User as UserType, ListingDetail } from '../../types';
import toast from 'react-hot-toast';

interface MarkAsSoldDialogProps {
  listing: ListingDetail;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'financing', label: 'Financing' },
  { value: 'other', label: 'Other' },
];

export function MarkAsSoldDialog({
  listing,
  open,
  onClose,
  onSuccess,
}: MarkAsSoldDialogProps) {
  const [buyers, setBuyers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>('');
  const [amount, setAmount] = useState<string>(listing.price.toString());
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (open) {
      loadBuyers();
    }
  }, [open, listing.id]);

  const loadBuyers = async () => {
    try {
      setLoading(true);
      const buyersList = await ListingService.getListingBuyers(listing.id);
      setBuyers(buyersList);
      if (buyersList.length > 0 && !selectedBuyerId) {
        setSelectedBuyerId(buyersList[0].id);
      }
    } catch (error: any) {
      toast.error('Failed to load buyers');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBuyerId) {
      toast.error('Please select a buyer');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid sale amount');
      return;
    }

    try {
      setSubmitting(true);
      await ListingService.markAsSold(listing.id, {
        buyerId: selectedBuyerId,
        amount: parseFloat(amount),
        paymentMethod,
        paymentReference: paymentReference || undefined,
        notes: notes || undefined,
      });

      toast.success('Listing marked as sold successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to mark listing as sold');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBuyer = buyers.find((b) => b.id === selectedBuyerId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mark Listing as Sold</DialogTitle>
          <DialogDescription>
            Select the buyer and enter the sale details to mark this listing as sold.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Buyer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Select Buyer *
            </label>
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading buyers...</div>
            ) : buyers.length === 0 ? (
              <div className="text-center py-4 text-gray-500 border border-gray-200 rounded-md">
                No buyers have contacted you about this listing yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {buyers.map((buyer) => (
                  <button
                    key={buyer.id}
                    type="button"
                    onClick={() => setSelectedBuyerId(buyer.id)}
                    className={`w-full flex items-center gap-3 p-3 border rounded-md transition-colors ${
                      selectedBuyerId === buyer.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Avatar
                      src={buyer.profileImage ? `http://localhost:3000${buyer.profileImage}` : undefined}
                      alt={`${buyer.firstName} ${buyer.lastName}`}
                      size="md"
                    />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">
                        {buyer.firstName} {buyer.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{buyer.email}</p>
                      {buyer.phoneNumber && (
                        <p className="text-sm text-gray-500">{buyer.phoneNumber}</p>
                      )}
                    </div>
                    {selectedBuyerId === buyer.id && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sale Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Final Sale Amount *
            </label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter sale amount"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Original listing price: ${listing.price.toLocaleString()}
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="w-4 h-4 inline mr-1" />
              Payment Method *
            </label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Reference */}
          <div>
            <label htmlFor="paymentReference" className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Payment Reference (Optional)
            </label>
            <Input
              id="paymentReference"
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g., Transaction number, Check number"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes about the sale..."
            />
          </div>

          {/* Selected Buyer Info */}
          {selectedBuyer && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Sale Summary:</p>
              <div className="text-sm text-blue-800 space-y-1">
                <p>
                  <strong>Buyer:</strong> {selectedBuyer.firstName} {selectedBuyer.lastName}
                </p>
                <p>
                  <strong>Amount:</strong> ${parseFloat(amount || '0').toLocaleString()}
                </p>
                <p>
                  <strong>Payment Method:</strong>{' '}
                  {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !selectedBuyerId || !amount || buyers.length === 0}
              className="bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500"
            >
              {submitting ? 'Processing...' : 'Mark as Sold'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

