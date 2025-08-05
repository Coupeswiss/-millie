import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography,
  Chip,
  Avatar,
  Fade,
  Card,
  CardContent,
  Skeleton,
  Divider,
  Button,
  Stack,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import GroupsIcon from '@mui/icons-material/Groups';
import LogoutIcon from '@mui/icons-material/Logout';
import ChatMessage from '../components/ChatMessage';
import api from '../api';

interface Props {
  token: string;
  userName?: string;
  isAdmin?: boolean;
  onLogout?: () => void;
}

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

interface CoinData {
  symbol: string;
  price: number;
  change: number;
}

interface WeeklyMeeting {
  date: string;
  topic: string;
  keyPoints: string[];
}

interface CommunityNewsItem {
  title: string;
  content: string;
  type: string;
}

interface CoinOfWeek {
  name: string;
  symbol: string;
  reason: string;
  targetPrice: string;
  currentPrice?: string;
  analysis?: string;
}

const defaultQuotes = [
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "In crypto, patience isn't just a virtue—it's a strategy.",
  "Understanding the technology is the first step to financial freedom.",
  "Fortune favors the brave, but wisdom protects the bold.",
  "Every expert was once a beginner. Keep learning, keep growing.",
];

// Mock data for weekly content
const weeklyMeeting = {
  date: 'Monday, December 16th',
  topic: 'DeFi Yield Strategies in Bear Markets',
  keyPoints: [
    'Stablecoin farming remains profitable with 8-15% APY',
    'Risk management is crucial - never invest more than you can afford to lose',
    'New protocols launching on Arbitrum show promise',
  ],
  recording: 'Available for members',
};

const defaultCommunityNews = [
  {
    title: 'PulseChain Mainnet Update',
    content: 'Network stability improved by 40% this week. Gas fees remain ultra-low.',
    type: 'update',
  },
  {
    title: 'New Partnership Announcement',
    content: 'Queen of Millions partners with leading DeFi education platform.',
    type: 'partnership',
  },
  {
    title: 'Community Milestone',
    content: 'We just hit 10,000 active members! Welcome to all newcomers.',
    type: 'milestone',
  },
];

const defaultCoinOfWeek = {
  name: 'PulseChain',
  symbol: 'PLS',
  reason: 'Native coin of the PulseChain ecosystem, gaining traction among DeFi users',
  targetPrice: '$0.0015',
  currentPrice: '$0.0009',
  analysis: 'Strong community support and increasing on-chain activity after mainnet launch.',
};

export default function ChatPage({ token, userName, isAdmin, onLogout }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [quotes, setQuotes] = useState<string[]>(defaultQuotes);
  const [marketData, setMarketData] = useState<CoinData[]>([
    { symbol: 'BTC', price: 0, change: 0 },
    { symbol: 'ETH', price: 0, change: 0 },
    { symbol: 'SOL', price: 0, change: 0 },
    { symbol: 'PLS', price: 0, change: 0 },
  ]);
  const [weeklyMeetingData, setWeeklyMeetingData] = useState<WeeklyMeeting | null>(null);
  const [newsItems, setNewsItems] = useState<CommunityNewsItem[]>(defaultCommunityNews);
  const [coin, setCoin] = useState<CoinOfWeek>(defaultCoinOfWeek);
  const [uploadText, setUploadText] = useState('');
  const [hasNewUpdate, setHasNewUpdate] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Fetch real crypto prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,pulsechain&vs_currencies=usd&include_24hr_change=true'
        );
        const data = await response.json();
        
        setMarketData([
          {
            symbol: 'BTC',
            price: data.bitcoin?.usd ?? 0,
            change: data.bitcoin?.usd_24h_change ?? 0,
          },
          {
            symbol: 'ETH',
            price: data.ethereum?.usd ?? 0,
            change: data.ethereum?.usd_24h_change ?? 0,
          },
          {
            symbol: 'SOL',
            price: data.solana?.usd ?? 0,
            change: data.solana?.usd_24h_change ?? 0,
          },
          {
            symbol: 'PLS',
            price: data.pulsechain?.usd ?? 0,
            change: data.pulsechain?.usd_24h_change ?? 0,
          },
        ]);
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [quotes]);

  // Fetch summary from server
  const fetchSummary = async () => {
    try {
      const res = await api.get('/api/summary');
      const { weeklyMeeting, dailyQuotes, communityNews, coinOfWeek, lastUpdated } = res.data;
      
      // Check if content is new
      if (lastUpdated && lastUpdated !== lastUpdateTime) {
        setHasNewUpdate(true);
        setLastUpdateTime(lastUpdated);
        // Auto-hide the indicator after 10 seconds
        setTimeout(() => setHasNewUpdate(false), 10000);
      }
      
      if (weeklyMeeting) setWeeklyMeetingData(weeklyMeeting);
      if (Array.isArray(dailyQuotes) && dailyQuotes.length) {
        setQuotes(dailyQuotes);
        setCurrentQuote(0);
      }
      if (Array.isArray(communityNews) && communityNews.length) setNewsItems(communityNews);
      if (coinOfWeek) setCoin(coinOfWeek);
    } catch (err) {
      console.warn('Failed to fetch summary', err);
    }
  };

  useEffect(() => {
    fetchSummary();
    const intervalId = setInterval(fetchSummary, 60 * 1000); // refresh every minute
    return () => clearInterval(intervalId);
  }, []);

  const handleUploadTranscript = async () => {
    if (!uploadText.trim()) return;
    try {
      await api.post('/api/transcripts', { text: uploadText });
      setUploadText('');
      // Refresh dashboard data
      fetchSummary();
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  // Add greeting on first load
  useEffect(() => {
    const name = userName || 'Friend';
    setMessages([
      {
        role: 'assistant',
        content:
          `✨ Welcome ${name}! I'm Millie, your guide inside Queen of Millions. 

I'm here to support you on your journey to financial sovereignty through crypto—no hype, no overwhelm, just clear guidance tailored to where you are right now.

Whether you're curious about PulseChain, want to understand DeFi, or need help building your portfolio with confidence, I'm here for you. 

What's on your mind today? 💜`,
      },
    ]);
  }, [userName]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessage: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post(
        '/api/chat',
        {
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: newMessage.content },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.content,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error: ' + err.message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0A1628 0%, #1E3A5F 50%, #0A1628 100%)' }}>
      {/* Hero Header */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.1) 0%, rgba(247, 178, 103, 0.1) 100%)',
        borderBottom: '2px solid rgba(78, 205, 196, 0.3)',
        py: 6,
        mb: 4,
      }}>
        <Container maxWidth="xl">
          <Box sx={{ textAlign: 'center', position: 'relative' }}>
            {/* Logout button */}
            <Button
              variant="outlined"
              startIcon={<LogoutIcon />}
              onClick={onLogout}
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                borderColor: 'rgba(78, 205, 196, 0.5)',
                color: 'text.primary',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'rgba(78, 205, 196, 0.1)',
                },
              }}
            >
              Logout
            </Button>
            <Typography variant="h2" sx={{ 
              fontWeight: 800, 
              background: 'linear-gradient(45deg, #4ECDC4 0%, #F7B267 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              {userName ? `Hi ${userName}!` : 'Queen of Millions'}
            </Typography>
            <Typography variant="h4" sx={{ 
              color: 'text.primary',
              fontWeight: 300,
              mb: 1,
            }}>
              Where Wealth Meets Soul
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              "You're Not Late. You're Right on Time—And You're Not Alone."
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ pb: 4 }}>
        <Grid container spacing={3}>
          {/* Left Column - Market & Community */}
          <Grid item xs={12} md={3}>
            {/* New Update Indicator */}
            <Fade in={hasNewUpdate}>
              <Paper sx={{ 
                p: 2, 
                mb: 2,
                background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.2) 0%, rgba(75, 0, 130, 0.15) 100%)',
                border: '2px solid rgba(138, 43, 226, 0.5)',
                textAlign: 'center',
              }}>
                <Typography variant="body2" sx={{ 
                  fontWeight: 700,
                  color: '#8A2BE2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}>
                  <AutoAwesomeIcon sx={{ fontSize: 18 }} />
                  New Content Available!
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Dashboard updated with fresh insights
                </Typography>
              </Paper>
            </Fade>
            {/* Live Market */}
            <Paper sx={{ 
              p: 3, 
              mb: 3, 
              background: 'rgba(30, 58, 95, 0.6)',
              border: '2px solid rgba(78, 205, 196, 0.3)',
            }}>
              <Typography variant="h6" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: 'primary.main',
                fontWeight: 700,
              }}>
                <TrendingUpIcon /> Live Market
              </Typography>
              {marketData.map((coin) => (
                <Card key={coin.symbol} sx={{ 
                  mb: 2, 
                  backgroundColor: 'rgba(78, 205, 196, 0.05)',
                  border: '1px solid rgba(78, 205, 196, 0.2)',
                }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{coin.symbol}</Typography>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {coin.price ? (
                            coin.price < 0.01 
                              ? `$${coin.price.toFixed(6)}` 
                              : `$${coin.price.toLocaleString()}`
                          ) : (
                            <Skeleton width={60} />
                          )}
                        </Typography>
                        <Chip
                          size="small"
                          icon={coin.change > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                          label={`${coin.change > 0 ? '+' : ''}${coin.change.toFixed(2)}%`}
                          color={coin.change > 0 ? 'success' : 'error'}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Paper>

            {/* PulseChain Spotlight */}
            <Paper sx={{ 
              p: 3, 
              mb: 3,
              background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.15) 0%, rgba(75, 0, 130, 0.1) 100%)',
              border: '2px solid rgba(138, 43, 226, 0.4)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                background: 'radial-gradient(circle, rgba(138, 43, 226, 0.3) 0%, transparent 70%)',
                borderRadius: '50%',
              }} />
              <Typography variant="h6" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                background: 'linear-gradient(90deg, #8A2BE2 0%, #9370DB 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700,
              }}>
                <RocketLaunchIcon sx={{ color: '#8A2BE2' }} /> PulseChain Spotlight
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#8A2BE2' }}>
                    {coin.symbol}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    {coin.name}
                  </Typography>
                </Box>
                
                <Box sx={{ 
                  display: 'flex', 
                  gap: 3, 
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  background: 'rgba(138, 43, 226, 0.05)',
                }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      Current Price
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {coin.currentPrice}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      Target Price
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                      {coin.targetPrice}
                    </Typography>
                  </Box>
                </Box>
                
                <Typography variant="body2" sx={{ 
                  mt: 2,
                  p: 2,
                  borderLeft: '3px solid rgba(138, 43, 226, 0.5)',
                  background: 'rgba(138, 43, 226, 0.03)',
                  fontStyle: 'italic',
                  lineHeight: 1.7,
                }}>
                  {coin.reason}
                </Typography>
                
                {coin.analysis && (
                  <Typography variant="caption" sx={{ 
                    display: 'block',
                    mt: 2,
                    color: 'text.secondary',
                    lineHeight: 1.6,
                  }}>
                    💡 {coin.analysis}
                  </Typography>
                )}
              </Box>
            </Paper>

            {/* Daily Wisdom */}
            <Paper sx={{ 
              p: 3, 
              background: 'rgba(78, 205, 196, 0.1)', 
              border: '1px solid rgba(78, 205, 196, 0.3)',
            }}>
              <Typography variant="h6" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: 'primary.main',
                fontWeight: 700,
              }}>
                <AutoAwesomeIcon /> Daily Wisdom
              </Typography>
              <Fade in key={currentQuote}>
                <Typography variant="body2" sx={{ fontStyle: 'italic', lineHeight: 1.8 }}>
                  "{quotes[currentQuote]}"
                </Typography>
              </Fade>
            </Paper>
          </Grid>

          {/* Center - Chat with Millie */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ 
              height: '80vh', 
              display: 'flex', 
              flexDirection: 'column',
              background: 'rgba(30, 58, 95, 0.4)',
              border: '2px solid rgba(78, 205, 196, 0.3)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Millie Header */}
              <Box sx={{ 
                p: 2, 
                borderBottom: '2px solid rgba(78, 205, 196, 0.3)',
                background: 'rgba(78, 205, 196, 0.05)',
              }}>
                <Typography variant="h5" sx={{ 
                  textAlign: 'center',
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #4ECDC4, #7FE7E0)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  Chat with Millie
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Your Personal Crypto Mentor
                </Typography>
              </Box>

              {/* Chat Messages */}
              <Box sx={{ 
                flexGrow: 1, 
                overflow: 'auto', 
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}>
                {messages.map((msg, idx) => (
                  <ChatMessage key={idx} role={msg.role} content={msg.content} />
                ))}
                {loading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontWeight: 700 }}>
                      M
                    </Avatar>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Box sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        bgcolor: 'primary.main',
                        animation: 'pulse 1.4s infinite',
                      }} />
                      <Box sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        bgcolor: 'primary.main',
                        animation: 'pulse 1.4s infinite 0.2s',
                      }} />
                      <Box sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        bgcolor: 'primary.main',
                        animation: 'pulse 1.4s infinite 0.4s',
                      }} />
                    </Box>
                  </Box>
                )}
                <div ref={bottomRef} />
              </Box>

              {/* Input Area */}
              <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{ 
                  p: 3, 
                  borderTop: '2px solid rgba(78, 205, 196, 0.3)',
                  background: 'rgba(10, 22, 40, 0.8)',
                }}
              >
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Ask about Bitcoin, DeFi, trading strategies, or any crypto topic..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(78, 205, 196, 0.05)',
                        borderRadius: 3,
                        '&:hover': {
                          backgroundColor: 'rgba(78, 205, 196, 0.1)',
                        },
                        '& fieldset': {
                          borderColor: 'rgba(78, 205, 196, 0.3)',
                          borderWidth: 2,
                        },
                      },
                    }}
                  />
                  <IconButton 
                    type="submit" 
                    disabled={loading || !input}
                    sx={{ 
                      bgcolor: 'primary.main',
                      color: 'white',
                      width: 56,
                      height: 56,
                      '&:hover': {
                        bgcolor: 'primary.dark',
                        transform: 'scale(1.1)',
                      },
                      transition: 'all 0.3s',
                      '&:disabled': {
                        bgcolor: 'action.disabledBackground',
                      },
                    }}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Right Column - Weekly Meeting & News */}
          <Grid item xs={12} md={3}>
            {/* Weekly Meeting Summary */}
            <Paper sx={{ 
              p: 3, 
              mb: 3,
              background: 'rgba(247, 178, 103, 0.1)',
              border: '2px solid rgba(247, 178, 103, 0.3)',
            }}>
              <Typography variant="h6" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: 'secondary.main',
                fontWeight: 700,
              }}>
                <CalendarMonthIcon /> Weekly Meeting
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {weeklyMeetingData?.date || weeklyMeeting.date}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, mt: 1, mb: 2 }}>
                {weeklyMeetingData?.topic || weeklyMeeting.topic}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                Key Takeaways:
              </Typography>
              <Stack spacing={1}>
                {(weeklyMeetingData?.keyPoints || weeklyMeeting.keyPoints).map((point, idx) => (
                  <Typography key={idx} variant="body2" sx={{ pl: 2 }}>
                    • {point}
                  </Typography>
                ))}
              </Stack>
              <Button 
                variant="contained" 
                fullWidth 
                sx={{ 
                  mt: 2,
                  background: 'linear-gradient(45deg, #F7B267, #FFD4A3)',
                  color: 'black',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(45deg, #E89923, #F7B267)',
                  },
                }}
              >
                Watch Recording
              </Button>
            </Paper>



            {/* Community News */}
            <Paper sx={{ 
              p: 3,
              background: 'rgba(30, 58, 95, 0.6)',
              border: '2px solid rgba(78, 205, 196, 0.3)',
            }}>
              <Typography variant="h6" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: 'primary.main',
                fontWeight: 700,
              }}>
                <NewspaperIcon /> Community News
              </Typography>
              <Stack spacing={2}>
                {newsItems.map((news, idx) => (
                  <Card key={idx} sx={{ 
                    backgroundColor: 'rgba(78, 205, 196, 0.05)',
                    border: '1px solid rgba(78, 205, 196, 0.2)',
                  }}>
                    <CardContent sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip 
                          label={news.type} 
                          size="small" 
                          color={news.type === 'milestone' ? 'success' : 'primary'}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {news.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {news.content}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
              <Button 
                variant="outlined" 
                fullWidth 
                sx={{ 
                  mt: 2,
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                  },
                }}
                startIcon={<GroupsIcon />}
              >
                Join Community
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </Box>
  );
} 