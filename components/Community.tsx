import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, TrendingUp, Search, Plus, User, Calendar, Send, X, Loader2 } from 'lucide-react';
import { getPosts, createPost, likePost, type Post } from '../services/communityService';
import { useLanguage, formatT } from '../i18n';

// Fallback mock data when API is unavailable
const MOCK_POSTS: Post[] = [
  { 
    postId: '1',
    authorId: 'user1',
    authorName: 'AlphaCapital',
    content: 'Monitoring the 140.50 level closely on $NVDA. Volume profile suggests significant institutional interest at this range. Thoughts on the Q3 guidance? #stocks #AI',
    type: 'analysis',
    likes: 124,
    likedBy: [],
    commentCount: 42,
    comments: [],
    tags: ['stocks', 'ai'],
    tickers: ['NVDA'],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  { 
    postId: '2',
    authorId: 'user2',
    authorName: 'CryptoWhale_01',
    content: 'Mirroring an additional 2.5 $BTC today. The volatility is providing a perfect accumulation zone before the monthly close. #crypto #bitcoin',
    type: 'trade_idea',
    likes: 89,
    likedBy: [],
    commentCount: 12,
    comments: [],
    tags: ['crypto', 'bitcoin'],
    tickers: ['BTC'],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  { 
    postId: '3',
    authorId: 'user3',
    authorName: 'GoldStandard',
    content: 'Rotating 15% of equity mirror into physical gold certificates. The hedge against currency devaluation remains paramount. #gold #hedge',
    type: 'discussion',
    likes: 215,
    likedBy: [],
    commentCount: 56,
    comments: [],
    tags: ['gold', 'hedge'],
    tickers: ['GOLD'],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
];

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getCategoryFromType(type: string): string {
  switch (type) {
    case 'analysis': return 'Analysis';
    case 'trade_idea': return 'Trade Idea';
    case 'question': return 'Question';
    default: return 'Discussion';
  }
}

export const Community: React.FC = () => {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState('discussion');
  const [submitting, setSubmitting] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // Fetch posts on mount
  useEffect(() => {
    fetchPosts();
  }, [filterType]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await getPosts({ 
        limit: 20, 
        type: filterType || undefined 
      });
      
      if (response.success && response.data.length > 0) {
        setPosts(response.data);
      } else {
        // Use mock data if no posts returned
        setPosts(MOCK_POSTS);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      setPosts(MOCK_POSTS);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    
    setSubmitting(true);
    try {
      const newPost = await createPost(newPostContent, newPostType);
      if (newPost) {
        setPosts([newPost, ...posts]);
        setNewPostContent('');
        setIsCreateModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const result = await likePost(postId);
      if (result) {
        setPosts(posts.map(p => 
          p.postId === postId 
            ? { ...p, likes: result.likes }
            : p
        ));
        
        const newLiked = new Set(likedPosts);
        if (result.liked) {
          newLiked.add(postId);
        } else {
          newLiked.delete(postId);
        }
        setLikedPosts(newLiked);
      }
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  // Filter posts by search query
  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.content.toLowerCase().includes(query) ||
      post.authorName.toLowerCase().includes(query) ||
      post.tags.some(tag => tag.includes(query)) ||
      post.tickers.some(ticker => ticker.toLowerCase().includes(query))
    );
  });
  return (
    <div className="space-y-10 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-400">{t('community.feedTitle')}</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white">{t('community.title')}</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">{t('community.subtitle')}</p>
        </div>
        
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-3 px-8 py-4 bg-white text-[#0b0e14] font-black uppercase tracking-widest text-[11px] rounded-[24px] shadow-2xl hover:bg-[#00e5ff] transition-all"
        >
          <Plus className="w-5 h-5" />
          {t('community.broadcast')}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search/Filter Bar */}
          <div className="card-surface p-4 rounded-[32px] flex items-center gap-4 bg-white/[0.01]">
            <div className="flex-1 relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#00e5ff] transition-colors" />
              <input 
                type="text" 
                placeholder={t('community.searchPlaceholder')} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0b0e14] border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold outline-none focus:ring-1 focus:ring-[#00e5ff]/50 transition-all text-white placeholder:text-slate-500"
              />
            </div>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="hidden sm:block bg-[#0b0e14] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer text-white"
            >
              <option value="">{t('community.allPosts')}</option>
              <option value="discussion">{t('community.discussion')}</option>
              <option value="analysis">{t('community.analysis')}</option>
              <option value="trade_idea">{t('community.tradeIdea')}</option>
              <option value="question">{t('community.question')}</option>
            </select>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#00e5ff] animate-spin" />
            </div>
          )}

          {/* Posts */}
          {!loading && filteredPosts.map((post) => (
            <div key={post.postId} className="card-surface p-8 rounded-[40px] border-l-4 border-l-transparent hover:border-l-[#00e5ff] transition-all group bg-gradient-to-br from-[#151921] to-[#0b0e14]">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 border border-white/5">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white group-hover:text-[#00e5ff] transition-colors">
                      {post.tickers.length > 0 ? `$${post.tickers[0]} Insight` : 'Market Insight'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{post.authorName}</span>
                      <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatTimeAgo(post.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-white/5 text-slate-400 text-[9px] font-black rounded-lg border border-white/5 uppercase tracking-widest">
                  {getCategoryFromType(post.type)}
                </span>
              </div>
              
              <p className="text-slate-400 text-sm mb-6 leading-relaxed font-medium">
                {post.content}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-8">
                {post.tickers.map(ticker => (
                  <span key={ticker} className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded-full border border-emerald-500/20 uppercase">
                    ${ticker}
                  </span>
                ))}
                {post.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-cyan-500/5 text-cyan-400 text-[9px] font-black rounded-full border border-cyan-500/10 uppercase">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-8 pt-6 border-t border-white/5">
                <button 
                  onClick={() => handleLike(post.postId)}
                  className={`flex items-center gap-2 transition-colors group/action ${
                    likedPosts.has(post.postId) ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'
                  }`}
                >
                  <ThumbsUp className={`w-4 h-4 group-hover/action:scale-110 transition-transform ${
                    likedPosts.has(post.postId) ? 'fill-emerald-400' : ''
                  }`} />
                  <span className="text-xs font-black">{post.likes}</span>
                </button>
                <button className="flex items-center gap-2 text-slate-500 hover:text-[#00e5ff] transition-colors group/action">
                  <MessageSquare className="w-4 h-4 group-hover/action:scale-110 transition-transform" />
                  <span className="text-xs font-black">{post.commentCount}</span>
                </button>
              </div>
            </div>
          ))}

          {/* No Posts */}
          {!loading && filteredPosts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-500 font-medium">{t('community.noPosts')}</p>
            </div>
          )}
        </div>

        {/* Sidebar Intelligence */}
        <div className="space-y-6">
          <div className="card-surface p-8 rounded-[40px] sticky top-24 bg-gradient-to-b from-[#151921] to-transparent">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-8">{t('community.leaderboard')}</h3>
            
            <div className="space-y-6">
              {[
                { name: 'Institutional_A', gain: '+45.2%', class: 'Crypto' },
                { name: 'EquityMirror_99', gain: '+12.8%', class: 'Stocks' },
                { name: 'GlobalSafe', gain: '+4.5%', class: 'Commodities' }
              ].map((leader, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-600 w-4">{i+1}</span>
                    <div>
                      <p className="text-xs font-black text-white group-hover:text-[#00e5ff] transition-colors">{leader.name}</p>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{leader.class}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-emerald-400">{leader.gain}</span>
                </div>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-white/5 text-center">
              <p className="text-[10px] text-slate-600 font-medium leading-relaxed mb-6">
                {t('community.privateMessage')}
              </p>
              <button className="w-full py-4 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                {t('community.enableBroadcast')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151921] rounded-[40px] w-full max-w-lg p-8 relative">
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-black text-white mb-6">{t('community.broadcast')}</h2>

            <div className="space-y-4">
              <select
                value={newPostType}
                onChange={(e) => setNewPostType(e.target.value)}
                className="w-full bg-[#0b0e14] border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold outline-none text-white"
              >
                <option value="discussion">{t('community.discussion')}</option>
                <option value="analysis">{t('community.analysis')}</option>
                <option value="trade_idea">{t('community.tradeIdea')}</option>
                <option value="question">{t('community.question')}</option>
              </select>

              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share your market insight... Use $TICKER for stocks/crypto and #tags for topics"
                className="w-full h-40 bg-[#0b0e14] border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium outline-none text-white placeholder:text-slate-500 resize-none focus:ring-1 focus:ring-[#00e5ff]/50"
              />

              <button
                onClick={handleCreatePost}
                disabled={submitting || !newPostContent.trim()}
                className="w-full py-4 bg-[#00e5ff] text-[#0b0e14] font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Broadcast
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
