/**
 * Tooltip explanations for all dashboard metrics
 * These help users understand what each metric represents
 */

export const METRIC_TOOLTIPS: Record<string, string> = {
  // Revenue Metrics
  'Total Revenue': 'Total revenue from all completed transactions in the selected time range.',
  'Platform Fees': 'Fee revenue collected by the platform. Calculated from the fee percentage on every completed sale.',
  'Avg Transaction Value': 'Average revenue per completed transaction. Total revenue divided by completed transactions.',
  'Completed Transactions': 'Number of transactions that finished successfully during the selected period.',
  'Pending Transactions': 'Transactions that were started but not finished yet.',
  'Cancelled Transactions': 'Transactions that were cancelled by either buyer, seller, or the system.',

  // User Metrics
  'Total Users': 'All registered users on the platform to date.',
  'Active Users': 'Users who performed at least one action (login, view, message, etc.) within the selected period.',
  'New Users': 'Users who created an account within the selected period.',
  'Growth Rate': 'Percentage change in total users compared to the previous period.',
  'Retention Rate': 'Percentage of returning users. Highlights user satisfaction and stickiness.',

  // Listing Metrics
  'Total Listings': 'All vehicle listings ever created, including active, sold, and rejected ones.',
  'Active Listings': 'Listings that are approved and visible to buyers right now.',
  'Pending Listings': 'Listings waiting for moderator or admin review before they can go live.',
  'Sold Listings': 'Listings marked as sold after a successful transaction.',
  'Total Views': 'Cumulative number of detail-page views for every listing.',
  'Total Favorites': 'Total times buyers saved listings to their favorites.',
  'Total Inquiries': 'Messages or inquiries sent from buyers to sellers about listings.',
  'Average Views Per Listing': 'Average number of views each listing receives. Helps gauge buyer interest.',
  'Conversion Rate': 'Percentage of listings or inquiries that resulted in a successful sale. Higher is better.',

  // Transaction Metrics
  'Total Transactions': 'All transactions created (completed, pending, and cancelled).',
  'Completion Rate': 'Percentage of transactions that successfully closed.',
  'Avg Time to Sale': 'Average number of days between publishing a listing and selling it.',

  // Engagement Metrics
  'Total Conversations': 'Chats initiated between buyers and sellers.',
  'Total Messages': 'Messages exchanged across all conversations.',
  'Active Conversations': 'Conversations with recent replies during the selected time.',
  'Average Messages Per Conversation': 'Average depth of each conversation. Indicates engagement between buyers and sellers.',
  'Response Rate': 'Percentage of messages that received a reply. Higher means faster support or seller responsiveness.',
  'Average Response Time': 'Average time it takes users to reply to a message.',

  // Admin/Moderator Specific
  'Approval Rate': 'Percentage of reviewed listings that were approved.',
  'Rejection Rate': 'Percentage of reviewed listings that were rejected.',
  'Pending Reviews': 'Listings currently waiting in the moderation queue.',
  'Approved Listings': 'Listings that passed moderation and are live.',
  'Rejected Listings': 'Listings that failed moderation and remain hidden.',
  'Total Reviewed': 'Total number of listings reviewed (approved + rejected).',

  // Real-time Monitoring Metrics
  'API Calls/min': 'Number of API requests the backend handled in the last minute.',
  'Error Rate': 'Percentage of API requests that returned 4xx or 5xx errors.',
  'Avg Response Time': 'Average API response time in milliseconds. Lower is better.',

  // Seller Specific (additional explanations)
  'Completed Sales': 'Number of vehicles you sold in the selected time range.',
  'Pending Approval': 'Your listings that still await admin or moderator approval.',

  // Buyer Specific
  'Messages Sent': 'How many messages you sent to sellers about listings.',
};

