/**
 * Community Service
 * API client for community/social features
 */

import { config } from '../config';

const API_BASE = config.apiUrl;

export interface Post {
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  type: 'discussion' | 'analysis' | 'trade_idea' | 'question';
  likes: number;
  likedBy: string[];
  commentCount: number;
  comments: Comment[];
  tags: string[];
  tickers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface PostsResponse {
  success: boolean;
  data: Post[];
  nextKey?: string;
  count: number;
}

/**
 * Get auth headers from stored token
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('finpulse_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

/**
 * Fetch posts with optional filtering
 */
export async function getPosts(options?: {
  limit?: number;
  type?: string;
  nextKey?: string;
}): Promise<PostsResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.type) params.set('type', options.type);
  if (options?.nextKey) params.set('nextKey', options.nextKey);

  const url = `${API_BASE}/community/posts${params.toString() ? '?' + params.toString() : ''}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching posts:', error);
    // Return mock data if API fails
    return { success: true, data: [], count: 0 };
  }
}

/**
 * Get a single post by ID
 */
export async function getPost(postId: string): Promise<Post | null> {
  try {
    const response = await fetch(`${API_BASE}/community/posts/${postId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch post: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

/**
 * Create a new post
 */
export async function createPost(content: string, type: string = 'discussion'): Promise<Post | null> {
  try {
    const response = await fetch(`${API_BASE}/community/posts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, type }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create post: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error creating post:', error);
    return null;
  }
}

/**
 * Like or unlike a post
 */
export async function likePost(postId: string): Promise<{ liked: boolean; likes: number } | null> {
  try {
    const response = await fetch(`${API_BASE}/community/posts/${postId}/like`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to like post: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error liking post:', error);
    return null;
  }
}

/**
 * Add a comment to a post
 */
export async function addComment(postId: string, content: string): Promise<Comment | null> {
  try {
    const response = await fetch(`${API_BASE}/community/posts/${postId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add comment: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error adding comment:', error);
    return null;
  }
}

/**
 * Delete a post (author only)
 */
export async function deletePost(postId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/community/posts/${postId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting post:', error);
    return false;
  }
}

/**
 * Get posts by ticker symbol
 */
export async function getPostsByTicker(ticker: string): Promise<Post[]> {
  try {
    const response = await fetch(`${API_BASE}/community/ticker/${ticker}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posts by ticker: ${response.status}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching posts by ticker:', error);
    return [];
  }
}
