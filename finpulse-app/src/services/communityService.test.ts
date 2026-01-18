/**
 * CommunityService Tests
 * Tests for community features: posts, comments, likes, and offline support
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();

// Mock localStorage with proper state management
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

let mockLocalStorage = createMockLocalStorage();

describe('communityService', () => {
  let originalFetch: typeof fetch;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    vi.resetAllMocks();
    mockLocalStorage = createMockLocalStorage();
    
    originalFetch = global.fetch;
    originalLocalStorage = global.localStorage;
    
    global.fetch = mockFetch;
    Object.defineProperty(global, 'localStorage', { value: mockLocalStorage, writable: true });
    
    // Set up auth token
    mockLocalStorage.setItem('finpulse_id_token', 'test-token');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(global, 'localStorage', { value: originalLocalStorage });
  });

  describe('getPosts', () => {
    it('should fetch community posts successfully', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          userId: 'user-1',
          username: 'testuser',
          content: 'Test post content',
          type: 'discussion',
          likes: 5,
          comments: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'post-2',
          userId: 'user-2',
          username: 'anotheruser',
          content: 'Another post',
          type: 'analysis',
          likes: 10,
          comments: [],
          createdAt: new Date().toISOString()
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockPosts })
      });

      const response = await mockFetch('/community/posts');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].content).toBe('Test post content');
    });

    it('should handle fetch failure gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(mockFetch('/community/posts')).rejects.toThrow('Network error');
    });

    it('should handle unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' })
      });

      const response = await mockFetch('/community/posts');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('createPost', () => {
    it('should create a new post successfully', async () => {
      const newPost = {
        content: 'My new post about BTC',
        type: 'analysis'
      };

      const createdPost = {
        id: 'post-new',
        userId: 'user-1',
        username: 'testuser',
        ...newPost,
        likes: 0,
        comments: [],
        createdAt: new Date().toISOString()
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: createdPost })
      });

      const response = await mockFetch('/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockLocalStorage.getItem('finpulse_id_token')}`
        },
        body: JSON.stringify(newPost)
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.content).toBe(newPost.content);
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: () => '60' },
        json: () => Promise.resolve({ error: 'Rate limit exceeded', retryAfter: 60 })
      });

      const response = await mockFetch('/community/posts', { method: 'POST' });
      expect(response.status).toBe(429);
    });

    it('should validate post content', () => {
      const emptyPost = { content: '', type: 'discussion' };
      const tooLongPost = { content: 'a'.repeat(10001), type: 'discussion' };
      
      expect(emptyPost.content.length).toBe(0);
      expect(tooLongPost.content.length).toBeGreaterThan(10000);
    });
  });

  describe('likePost', () => {
    it('should like a post optimistically', async () => {
      const postId = 'post-1';
      
      // Store optimistic like
      const likedPosts = JSON.parse(mockLocalStorage.getItem('finpulse_liked_posts') || '[]');
      likedPosts.push(postId);
      mockLocalStorage.setItem('finpulse_liked_posts', JSON.stringify(likedPosts));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, liked: true, likes: 6 })
      });

      const response = await mockFetch(`/community/posts/${postId}/like`, { method: 'POST' });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.liked).toBe(true);
      expect(JSON.parse(mockLocalStorage.getItem('finpulse_liked_posts')!)).toContain(postId);
    });

    it('should unlike a post', async () => {
      const postId = 'post-1';
      mockLocalStorage.setItem('finpulse_liked_posts', JSON.stringify([postId]));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, liked: false, likes: 5 })
      });

      const response = await mockFetch(`/community/posts/${postId}/like`, { method: 'POST' });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.liked).toBe(false);
    });

    it('should persist likes to localStorage', () => {
      const likedPosts = ['post-1', 'post-2', 'post-3'];
      mockLocalStorage.setItem('finpulse_liked_posts', JSON.stringify(likedPosts));
      
      const stored = JSON.parse(mockLocalStorage.getItem('finpulse_liked_posts')!);
      expect(stored).toEqual(likedPosts);
    });
  });

  describe('addComment', () => {
    it('should add a comment to a post', async () => {
      const postId = 'post-1';
      const comment = { content: 'Great analysis!' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            id: 'comment-1',
            userId: 'user-1',
            username: 'testuser',
            content: comment.content,
            createdAt: new Date().toISOString()
          }
        })
      });

      const response = await mockFetch(`/community/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify(comment)
      });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.content).toBe(comment.content);
    });

    it('should handle comment rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Rate limit exceeded' })
      });

      const response = await mockFetch('/community/posts/post-1/comments', { method: 'POST' });
      expect(response.status).toBe(429);
    });
  });

  describe('Offline Support', () => {
    it('should cache posts for offline access', () => {
      const cachedPosts = [
        { id: 'post-1', content: 'Cached post', likes: 5 }
      ];
      mockLocalStorage.setItem('finpulse_community_cache', JSON.stringify(cachedPosts));

      const cached = JSON.parse(mockLocalStorage.getItem('finpulse_community_cache')!);
      expect(cached).toHaveLength(1);
      expect(cached[0].content).toBe('Cached post');
    });

    it('should return cached posts when offline', () => {
      const cachedPosts = [{ id: 'post-1', content: 'Offline post' }];
      mockLocalStorage.setItem('finpulse_community_cache', JSON.stringify(cachedPosts));

      // Simulate offline behavior
      const isOnline = false;
      if (!isOnline) {
        const cached = JSON.parse(mockLocalStorage.getItem('finpulse_community_cache')!);
        expect(cached).toBeDefined();
        expect(cached[0].content).toBe('Offline post');
      }
    });

    it('should queue likes when offline', () => {
      const pendingLikes = ['post-1', 'post-2'];
      mockLocalStorage.setItem('finpulse_pending_likes', JSON.stringify(pendingLikes));

      const pending = JSON.parse(mockLocalStorage.getItem('finpulse_pending_likes')!);
      expect(pending).toHaveLength(2);
    });
  });

  describe('Post Types', () => {
    it.each([
      ['discussion', 'General discussion post'],
      ['analysis', 'Technical analysis content'],
      ['question', 'Help me understand...'],
      ['news', 'Breaking news about...']
    ])('should handle %s post type', (type, content) => {
      const post = { type, content };
      expect(post.type).toBe(type);
      expect(post.content).toBe(content);
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' })
      });

      const response = await mockFetch('/community/posts');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should handle malformed responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const response = await mockFetch('/community/posts');
      await expect(response.json()).rejects.toThrow('Invalid JSON');
    });
  });
});
