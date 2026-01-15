/**
 * FinPulse Community Service
 * Social features: posts, comments, likes, follows
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

// Validation utilities
let validation;
try {
  validation = require('./shared/validation');
} catch {
  // Fallback if shared module not copied yet
  validation = {
    validatePost: (input) => ({ valid: true, data: input }),
    validateComment: (input) => ({ valid: true, data: input }),
    sanitizeString: (str) => str,
    checkRateLimit: () => ({ allowed: true, remaining: 100 })
  };
}

// Initialize clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const POSTS_TABLE = `finpulse-community_posts-${process.env.ENVIRONMENT}`;
const USERS_TABLE = `finpulse-users-${process.env.ENVIRONMENT}`;

/**
 * CORS headers - Restricted to production domain only
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://finpulse.me',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

/**
 * Extract user from event
 */
function getUserFromEvent(event) {
  if (event.requestContext?.authorizer?.claims) {
    return {
      userId: event.requestContext.authorizer.claims.sub,
      email: event.requestContext.authorizer.claims.email,
      name: event.requestContext.authorizer.claims.name || event.requestContext.authorizer.claims.email?.split('@')[0]
    };
  }
  // For testing
  if (event.headers?.['x-user-id']) {
    return {
      userId: event.headers['x-user-id'],
      email: event.headers['x-user-email'] || 'test@example.com',
      name: event.headers['x-user-name'] || 'Test User'
    };
  }
  return null;
}

/**
 * Generate unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a post
 */
async function createPost(user, content, type = 'discussion') {
  const postId = generateId();
  const timestamp = new Date().toISOString();

  const post = {
    postId,
    authorId: user.userId,
    authorName: user.name,
    content,
    type, // discussion, analysis, trade_idea, question
    likes: 0,
    likedBy: [],
    commentCount: 0,
    comments: [],
    tags: extractTags(content),
    tickers: extractTickers(content),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await docClient.send(new PutCommand({
    TableName: POSTS_TABLE,
    Item: post
  }));

  return post;
}

/**
 * Extract hashtags from content
 */
function extractTags(content) {
  const matches = content.match(/#(\w+)/g) || [];
  return matches.map(tag => tag.substring(1).toLowerCase());
}

/**
 * Extract stock/crypto tickers from content ($BTC, $AAPL)
 */
function extractTickers(content) {
  const matches = content.match(/\$([A-Z]{1,5})/g) || [];
  return matches.map(ticker => ticker.substring(1));
}

/**
 * Get posts with pagination
 */
async function getPosts(limit = 20, lastKey = null, type = null) {
  let params = {
    TableName: POSTS_TABLE,
    Limit: limit,
    ScanIndexForward: false // Newest first
  };

  if (lastKey) {
    params.ExclusiveStartKey = JSON.parse(Buffer.from(lastKey, 'base64').toString());
  }

  if (type) {
    params.FilterExpression = '#type = :type';
    params.ExpressionAttributeNames = { '#type': 'type' };
    params.ExpressionAttributeValues = { ':type': type };
  }

  const result = await docClient.send(new ScanCommand(params));

  // Sort by createdAt descending
  const sortedItems = (result.Items || []).sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  return {
    posts: sortedItems,
    nextKey: result.LastEvaluatedKey 
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null
  };
}

/**
 * Get a single post
 */
async function getPost(postId) {
  const result = await docClient.send(new GetCommand({
    TableName: POSTS_TABLE,
    Key: { postId }
  }));

  return result.Item || null;
}

/**
 * Like a post
 */
async function likePost(postId, userId) {
  const post = await getPost(postId);
  if (!post) throw new Error('Post not found');

  const likedBy = post.likedBy || [];
  const alreadyLiked = likedBy.includes(userId);

  if (alreadyLiked) {
    // Unlike
    await docClient.send(new UpdateCommand({
      TableName: POSTS_TABLE,
      Key: { postId },
      UpdateExpression: 'SET likes = likes - :dec, likedBy = :likedBy',
      ExpressionAttributeValues: {
        ':dec': 1,
        ':likedBy': likedBy.filter(id => id !== userId)
      }
    }));
    return { liked: false, likes: post.likes - 1 };
  } else {
    // Like
    await docClient.send(new UpdateCommand({
      TableName: POSTS_TABLE,
      Key: { postId },
      UpdateExpression: 'SET likes = likes + :inc, likedBy = :likedBy',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':likedBy': [...likedBy, userId]
      }
    }));
    return { liked: true, likes: post.likes + 1 };
  }
}

/**
 * Add a comment
 */
async function addComment(postId, user, content) {
  const post = await getPost(postId);
  if (!post) throw new Error('Post not found');

  const comment = {
    id: generateId(),
    authorId: user.userId,
    authorName: user.name,
    content,
    createdAt: new Date().toISOString()
  };

  const comments = [...(post.comments || []), comment];

  await docClient.send(new UpdateCommand({
    TableName: POSTS_TABLE,
    Key: { postId },
    UpdateExpression: 'SET comments = :comments, commentCount = :count, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':comments': comments,
      ':count': comments.length,
      ':updatedAt': new Date().toISOString()
    }
  }));

  return comment;
}

/**
 * Delete a post (author only)
 */
async function deletePost(postId, userId) {
  const post = await getPost(postId);
  if (!post) throw new Error('Post not found');
  if (post.authorId !== userId) throw new Error('Not authorized');

  await docClient.send(new DeleteCommand({
    TableName: POSTS_TABLE,
    Key: { postId }
  }));

  return { success: true };
}

/**
 * Get posts by ticker
 */
async function getPostsByTicker(ticker, limit = 20) {
  const result = await docClient.send(new ScanCommand({
    TableName: POSTS_TABLE,
    FilterExpression: 'contains(tickers, :ticker)',
    ExpressionAttributeValues: { ':ticker': ticker.toUpperCase() },
    Limit: limit
  }));

  return (result.Items || []).sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
}

/**
 * Get posts by user
 */
async function getPostsByUser(userId, limit = 20) {
  const result = await docClient.send(new ScanCommand({
    TableName: POSTS_TABLE,
    FilterExpression: 'authorId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
    Limit: limit
  }));

  return (result.Items || []).sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
}

/**
 * Main handler
 */
/**
 * Sanitize event for logging (remove sensitive headers)
 */
function sanitizeEvent(event) {
  const sanitized = { ...event };
  if (sanitized.headers) {
    sanitized.headers = { ...sanitized.headers };
    delete sanitized.headers.Authorization;
    delete sanitized.headers.authorization;
    delete sanitized.headers.Cookie;
    delete sanitized.headers.cookie;
  }
  if (sanitized.multiValueHeaders) {
    sanitized.multiValueHeaders = { ...sanitized.multiValueHeaders };
    delete sanitized.multiValueHeaders.Authorization;
    delete sanitized.multiValueHeaders.authorization;
  }
  return sanitized;
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(sanitizeEvent(event)));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const path = event.path || '';
    const method = event.httpMethod || 'GET';
    const body = event.body ? JSON.parse(event.body) : {};
    const queryParams = event.queryStringParameters || {};
    const pathParams = event.pathParameters || {};

    // Public endpoints (no auth required)
    // GET /community/posts - List posts
    if (path.endsWith('/posts') && method === 'GET') {
      const limit = Math.min(parseInt(queryParams.limit) || 20, 50);
      const type = queryParams.type;
      const nextKey = queryParams.nextKey;

      const result = await getPosts(limit, nextKey, type);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: result.posts,
          nextKey: result.nextKey,
          count: result.posts.length
        })
      };
    }

    // GET /community/posts/{id} - Get single post
    if (path.match(/\/posts\/[^/]+$/) && method === 'GET') {
      const postId = pathParams.postId || path.split('/').pop();
      const post = await getPost(postId);

      if (!post) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Post not found' })
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, data: post })
      };
    }

    // GET /community/ticker/{ticker} - Posts about a ticker
    if (path.includes('/ticker/') && method === 'GET') {
      const ticker = pathParams.ticker || path.split('/').pop();
      const posts = await getPostsByTicker(ticker);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: posts,
          ticker: ticker.toUpperCase(),
          count: posts.length
        })
      };
    }

    // Protected endpoints (auth required)
    const user = getUserFromEvent(event);
    if (!user && ['POST', 'PUT', 'DELETE'].includes(method)) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Unauthorized' })
      };
    }

    // POST /community/posts - Create post
    if (path.endsWith('/posts') && method === 'POST') {
      // Rate limit check
      const rateLimit = validation.checkRateLimit(user.userId, 'create_post', 10, 60000);
      if (!rateLimit.allowed) {
        return {
          statusCode: 429,
          headers: { ...corsHeaders, 'Retry-After': String(rateLimit.retryAfter) },
          body: JSON.stringify({ 
            success: false, 
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: rateLimit.retryAfter
          })
        };
      }

      // Validate input
      const validationResult = validation.validatePost(body);
      if (!validationResult.valid) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            success: false, 
            error: 'Validation failed',
            details: validationResult.errors
          })
        };
      }

      const post = await createPost(user, validationResult.data.content, validationResult.data.type);

      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, data: post })
      };
    }

    // POST /community/posts/{id}/like - Like/unlike post
    if (path.includes('/like') && method === 'POST') {
      const postId = pathParams.postId || path.split('/')[path.split('/').indexOf('posts') + 1];
      const result = await likePost(postId, user.userId);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, data: result })
      };
    }

    // POST /community/posts/{id}/comments - Add comment
    if (path.includes('/comments') && method === 'POST') {
      const postId = pathParams.postId || path.split('/')[path.split('/').indexOf('posts') + 1];

      // Rate limit check
      const rateLimit = validation.checkRateLimit(user.userId, 'add_comment', 30, 60000);
      if (!rateLimit.allowed) {
        return {
          statusCode: 429,
          headers: { ...corsHeaders, 'Retry-After': String(rateLimit.retryAfter) },
          body: JSON.stringify({ 
            success: false, 
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: rateLimit.retryAfter
          })
        };
      }

      // Validate input
      const validationResult = validation.validateComment(body);
      if (!validationResult.valid) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            success: false, 
            error: 'Validation failed',
            details: validationResult.errors
          })
        };
      }

      const comment = await addComment(postId, user, validationResult.data.content);

      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, data: comment })
      };
    }

    // DELETE /community/posts/{id} - Delete post
    if (path.match(/\/posts\/[^/]+$/) && method === 'DELETE') {
      const postId = pathParams.postId || path.split('/').pop();
      await deletePost(postId, user.userId);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: 'Post deleted' })
      };
    }

    // GET /community/user/{userId}/posts - User's posts
    if (path.includes('/user/') && path.includes('/posts') && method === 'GET') {
      const targetUserId = pathParams.userId || path.split('/')[path.split('/').indexOf('user') + 1];
      const posts = await getPostsByUser(targetUserId);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: posts,
          count: posts.length
        })
      };
    }

    // Default
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        service: 'FinPulse Community Service',
        version: '1.0.0',
        endpoints: [
          'GET /community/posts',
          'GET /community/posts/{id}',
          'POST /community/posts',
          'DELETE /community/posts/{id}',
          'POST /community/posts/{id}/like',
          'POST /community/posts/{id}/comments',
          'GET /community/ticker/{ticker}',
          'GET /community/user/{userId}/posts'
        ],
        postTypes: ['discussion', 'analysis', 'trade_idea', 'question']
      })
    };

  } catch (error) {
    console.error('Error:', error);
    const statusCode = error.message === 'Post not found' ? 404 
      : error.message === 'Not authorized' ? 403 
      : 500;

    return {
      statusCode,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};
