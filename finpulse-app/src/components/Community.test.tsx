/**
 * Community Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Community } from '../../components/Community';
import type { Post, PostsResponse } from '../../services/communityService';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const makeMockPost = (overrides: Partial<Post> = {}): Post => ({
  postId: 'post-1',
  authorId: 'author-1',
  authorName: 'TraderX',
  content: 'BTC looking strong at support level',
  type: 'analysis',
  likes: 5,
  likedBy: [],
  commentCount: 2,
  comments: [
    { id: 'c1', authorId: 'a2', authorName: 'CryptoFan', content: 'Agreed!', createdAt: new Date().toISOString() },
    { id: 'c2', authorId: 'a3', authorName: 'Bull99', content: 'Nice analysis', createdAt: new Date().toISOString() },
  ],
  tags: ['technical', 'support'],
  tickers: ['BTC'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const mockPosts: Post[] = [
  makeMockPost(),
  makeMockPost({
    postId: 'post-2',
    authorName: 'EquityPulse',
    content: 'AAPL earnings beat expectations',
    type: 'trade_idea',
    likes: 12,
    commentCount: 0,
    comments: [],
    tags: ['earnings'],
    tickers: ['AAPL'],
  }),
];

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetPosts = vi.fn().mockResolvedValue({
  success: true,
  data: mockPosts,
  count: mockPosts.length,
});

const mockCreatePost = vi.fn().mockResolvedValue(
  makeMockPost({ postId: 'post-new', content: 'New post content', authorName: 'Me' }),
);

const mockLikePost = vi.fn().mockResolvedValue({ likes: 6, liked: true });

vi.mock('../../services/communityService', () => ({
  getPosts: (...args: any[]) => mockGetPosts(...args),
  createPost: (...args: any[]) => mockCreatePost(...args),
  likePost: (...args: any[]) => mockLikePost(...args),
  addComment: vi.fn().mockResolvedValue({
    id: 'c-new',
    authorId: 'current-user',
    authorName: 'You',
    content: 'My comment',
    createdAt: new Date().toISOString(),
  }),
}));

vi.mock('../../services/logger', () => ({
  componentLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// Mock i18n
vi.mock('../../i18n', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'community.feedTitle': 'Community Feed',
        'community.title': 'Community',
        'community.subtitle': 'Share insights with fellow traders',
        'community.broadcast': 'Broadcast',
        'community.searchPlaceholder': 'Search posts...',
        'community.allPosts': 'All Posts',
        'community.discussion': 'Discussion',
        'community.analysis': 'Analysis',
        'community.tradeIdea': 'Trade Idea',
        'community.question': 'Question',
        'community.noPosts': 'No matching posts found',
        'community.leaderboard': 'Leaderboard',
        'community.privateMessage': 'Private messaging coming soon',
        'community.enableBroadcast': 'Enable Broadcast',
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Community', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPosts.mockResolvedValue({ success: true, data: mockPosts, count: mockPosts.length });
  });

  it('renders header and broadcast button', async () => {
    render(<Community />);

    expect(screen.getByText('Community')).toBeInTheDocument();
    expect(screen.getByText('Share insights with fellow traders')).toBeInTheDocument();

    // Broadcast button in header
    const broadcastBtns = screen.getAllByText('Broadcast');
    expect(broadcastBtns.length).toBeGreaterThan(0);
  });

  it('shows loading spinner while fetching posts', () => {
    // Make getPosts hang so the loading state stays visible
    mockGetPosts.mockReturnValue(new Promise(() => {}));
    render(<Community />);

    // The Loader2 spinner should be present (it has the animate-spin class)
    const spinners = document.querySelectorAll('.animate-spin');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('displays posts after loading', async () => {
    render(<Community />);

    await waitFor(() => {
      expect(screen.getByText('BTC looking strong at support level')).toBeInTheDocument();
    });

    expect(screen.getByText('AAPL earnings beat expectations')).toBeInTheDocument();
    expect(screen.getByText('TraderX')).toBeInTheDocument();
    expect(screen.getByText('EquityPulse')).toBeInTheDocument();
  });

  it('displays ticker and tag badges on posts', async () => {
    render(<Community />);

    await waitFor(() => {
      expect(screen.getByText('$BTC')).toBeInTheDocument();
    });

    expect(screen.getByText('$AAPL')).toBeInTheDocument();
    expect(screen.getByText('#technical')).toBeInTheDocument();
    expect(screen.getByText('#support')).toBeInTheDocument();
    expect(screen.getByText('#earnings')).toBeInTheDocument();
  });

  it('shows category label derived from post type', async () => {
    render(<Community />);

    await waitFor(() => {
      // "Analysis" appears in the filter dropdown AND as a category badge on the post
      const analysisElements = screen.getAllByText('Analysis');
      expect(analysisElements.length).toBeGreaterThanOrEqual(1);
    });
    // "Trade Idea" appears in the dropdown AND as a category badge
    const tradeIdeaElements = screen.getAllByText('Trade Idea');
    expect(tradeIdeaElements.length).toBeGreaterThanOrEqual(2);
  });

  it('shows empty state when no posts and no error', async () => {
    mockGetPosts.mockResolvedValue({ success: true, data: [], count: 0 });
    render(<Community />);

    await waitFor(() => {
      expect(screen.getByText('No posts yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Create First Post')).toBeInTheDocument();
  });

  it('shows error banner when API returns an error', async () => {
    mockGetPosts.mockResolvedValue({ success: false, data: [], count: 0 });
    render(<Community />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load community posts.')).toBeInTheDocument();
    });

    // Retry button should be visible
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows error banner when API throws', async () => {
    mockGetPosts.mockRejectedValue(new Error('Network error'));
    render(<Community />);

    await waitFor(() => {
      expect(screen.getByText('Unable to connect to community server. Please try again.')).toBeInTheDocument();
    });
  });

  it('filters posts by search query', async () => {
    const user = userEvent.setup();
    render(<Community />);

    await waitFor(() => {
      expect(screen.getByText('BTC looking strong at support level')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search posts...');
    await user.type(searchInput, 'AAPL');

    // Only AAPL post should remain
    expect(screen.getByText('AAPL earnings beat expectations')).toBeInTheDocument();
    expect(screen.queryByText('BTC looking strong at support level')).not.toBeInTheDocument();
  });

  it('opens create-post modal and submits a new post', async () => {
    const user = userEvent.setup();
    render(<Community />);

    await waitFor(() => {
      expect(screen.getByText('BTC looking strong at support level')).toBeInTheDocument();
    });

    // Click the header Broadcast button (first one)
    const broadcastBtns = screen.getAllByText('Broadcast');
    await user.click(broadcastBtns[0]);

    // Modal should open with the textarea placeholder
    const textarea = screen.getByPlaceholderText(/Share your market insight/i);
    expect(textarea).toBeInTheDocument();

    // Type content and submit
    await user.type(textarea, 'New post content');

    // There are multiple "Broadcast" buttons; the submit one is inside the modal
    // It's the last one in DOM order
    const allBroadcast = screen.getAllByRole('button', { name: /broadcast/i });
    const modalSubmit = allBroadcast[allBroadcast.length - 1];
    await user.click(modalSubmit);

    await waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalledWith('New post content', 'discussion');
    });
  });

  it('toggles comments section when comment button is clicked', async () => {
    const user = userEvent.setup();
    render(<Community />);

    await waitFor(() => {
      expect(screen.getByText('BTC looking strong at support level')).toBeInTheDocument();
    });

    // Click the comment count button (shows "2" for first post)
    // The comment button displays the commentCount
    const commentButtons = screen.getAllByText('2');
    await user.click(commentButtons[0]);

    // Comments should expand and show existing comments
    await waitFor(() => {
      expect(screen.getByText('Agreed!')).toBeInTheDocument();
      expect(screen.getByText('Nice analysis')).toBeInTheDocument();
    });

    // Comment input should appear
    expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
  });

  it('renders the leaderboard sidebar', async () => {
    render(<Community />);

    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Institutional_A')).toBeInTheDocument();
    expect(screen.getByText('EquityPulse_99')).toBeInTheDocument();
    expect(screen.getByText('GlobalSafe')).toBeInTheDocument();
    expect(screen.getByText('+45.2%')).toBeInTheDocument();
  });
});
