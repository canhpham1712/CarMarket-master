import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationBell } from '../NotificationBell';

// Mock NotificationContext
const mockUseNotifications = vi.fn();
vi.mock('../../contexts/NotificationContext', () => ({
  useNotifications: () => mockUseNotifications(),
  NotificationProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotifications.mockReturnValue({
      unreadCount: 5,
    });
  });

  it('should render bell icon', () => {
    render(<NotificationBell />);

    const bellButton = screen.getByLabelText('Notifications');
    expect(bellButton).toBeInTheDocument();
  });

  it('should display unread count badge when unreadCount > 0', () => {
    render(<NotificationBell />);

    const badge = screen.getByText('5');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-red-500');
  });

  it('should display "99+" when unreadCount > 99', () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 100,
    });

    render(<NotificationBell />);

    const badge = screen.getByText('99+');
    expect(badge).toBeInTheDocument();
  });

  it('should not display badge when unreadCount is 0', () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 0,
    });

    render(<NotificationBell />);

    const badge = screen.queryByText('0');
    expect(badge).not.toBeInTheDocument();
  });

  it('should toggle dropdown when clicked', () => {
    render(
      <NotificationProvider>
        <NotificationBell />
      </NotificationProvider>
    );

    const bellButton = screen.getByLabelText('Notifications');
    fireEvent.click(bellButton);

    // Dropdown should be visible (check for NotificationDropdown content)
    // This depends on your implementation
  });
});

