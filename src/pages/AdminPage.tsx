import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
  Snackbar,
  Tab,
  Tabs,
  Chip,
  Stack,
  LinearProgress,
  IconButton,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SettingsIcon from '@mui/icons-material/Settings';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import GroupsIcon from '@mui/icons-material/Groups';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import api from '../api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface Props {
  onLogout: () => void;
}

export default function AdminPage({ onLogout }: Props) {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Collective Consciousness
  const [collectiveText, setCollectiveText] = useState('');
  
  // Transcripts
  const [transcriptText, setTranscriptText] = useState('');
  
  // System Prompt
  const [systemPrompt, setSystemPrompt] = useState('');
  
  // Daily Wisdom
  const [dailyQuotes, setDailyQuotes] = useState<string[]>([]);
  const [newQuote, setNewQuote] = useState('');
  
  // Whitelist
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [csvEmails, setCsvEmails] = useState('');

  useEffect(() => {
    if (tabValue === 2) {
      fetchSystemPrompt();
    } else if (tabValue === 3) {
      fetchDailyQuotes();
    } else if (tabValue === 4) {
      fetchWhitelist();
    }
  }, [tabValue]);

  // Collective Consciousness Handler
  const handleCollectiveUpload = async () => {
    if (!collectiveText.trim()) return;
    
    setLoading(true);
    try {
      await api.post('/api/admin/collective', { 
        text: collectiveText,
        type: 'consciousness',
        date: new Date().toISOString()
      });
      setSnackbar({ open: true, message: 'Added to Millie\'s collective consciousness!', severity: 'success' });
      setCollectiveText('');
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to upload', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Transcript Handler
  const handleTranscriptUpload = async () => {
    if (!transcriptText.trim()) return;
    
    setLoading(true);
    try {
      await api.post('/api/transcripts', { text: transcriptText });
      setSnackbar({ open: true, message: 'Transcript uploaded successfully!', severity: 'success' });
      setTranscriptText('');
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to upload transcript', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // System Prompt Handlers
  const fetchSystemPrompt = async () => {
    try {
      const res = await api.get('/api/admin/system-prompt');
      setSystemPrompt(res.data.prompt || '');
    } catch (err) {
      console.error('Failed to fetch system prompt', err);
    }
  };

  const handleSystemPromptUpdate = async () => {
    if (!systemPrompt.trim()) return;
    
    setLoading(true);
    try {
      await api.post('/api/admin/system-prompt', { prompt: systemPrompt });
      setSnackbar({ open: true, message: 'System prompt updated!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update system prompt', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Daily Quotes Handlers
  const fetchDailyQuotes = async () => {
    try {
      const res = await api.get('/api/summary');
      setDailyQuotes(res.data.dailyQuotes || []);
    } catch (err) {
      console.error('Failed to fetch daily quotes', err);
    }
  };

  const handleAddQuote = async () => {
    if (!newQuote.trim()) return;
    
    setLoading(true);
    try {
      const updatedQuotes = [...dailyQuotes, newQuote];
      await api.post('/api/admin/daily-quotes', { quotes: updatedQuotes });
      setSnackbar({ open: true, message: 'Quote added!', severity: 'success' });
      setNewQuote('');
      fetchDailyQuotes();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to add quote', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuote = async (index: number) => {
    setLoading(true);
    try {
      const updatedQuotes = dailyQuotes.filter((_, i) => i !== index);
      await api.post('/api/admin/daily-quotes', { quotes: updatedQuotes });
      fetchDailyQuotes();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete quote', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Whitelist Handlers
  const fetchWhitelist = async () => {
    try {
      const res = await api.get('/api/admin/whitelist');
      setWhitelist(res.data.allowedEmails || []);
    } catch (err) {
      console.error('Failed to fetch whitelist', err);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim()) return;
    
    setLoading(true);
    try {
      await api.post('/api/admin/whitelist/add', { email: newEmail });
      setSnackbar({ open: true, message: 'Email added to whitelist!', severity: 'success' });
      setNewEmail('');
      fetchWhitelist();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to add email', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvEmails.trim()) return;
    
    setLoading(true);
    try {
      const emails = csvEmails
        .split(/[,\n;]/)
        .map(email => email.trim())
        .filter(email => email.length > 0);
      
      await api.post('/api/admin/whitelist/upload', { emails });
      setSnackbar({ open: true, message: `Added ${emails.length} emails to whitelist!`, severity: 'success' });
      setCsvEmails('');
      fetchWhitelist();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to upload emails', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f2f5' }}>
      {/* Header */}
      <Paper sx={{ 
        borderRadius: 0, 
        mb: 3,
        background: '#1a1a1a',
        color: '#fff',
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            py: 2.5,
          }}>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>
              Millie Admin Portal
            </Typography>
            <Button
              variant="outlined"
              startIcon={<LogoutIcon />}
              onClick={onLogout}
              sx={{ 
                borderColor: '#fff', 
                color: '#fff',
                '&:hover': {
                  borderColor: '#fff',
                  background: 'rgba(255,255,255,0.1)',
                }
              }}
            >
              Logout
            </Button>
          </Box>
        </Container>
      </Paper>

      <Container maxWidth="lg">
        <Paper sx={{ 
          bgcolor: '#fff', 
          borderRadius: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 2,
              borderColor: '#e0e0e0',
              background: '#fafafa',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                color: '#666',
                '&.Mui-selected': {
                  color: '#1a1a1a',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#1a1a1a',
                height: 3,
              },
            }}
          >
            <Tab label="Collective Consciousness" icon={<PsychologyIcon />} iconPosition="start" />
            <Tab label="Meeting Transcripts" icon={<UploadFileIcon />} iconPosition="start" />
            <Tab label="System Prompt" icon={<SettingsIcon />} iconPosition="start" />
            <Tab label="Daily Wisdom" icon={<FormatQuoteIcon />} iconPosition="start" />
            <Tab label="Member Whitelist" icon={<GroupsIcon />} iconPosition="start" />
          </Tabs>

          {/* Collective Consciousness Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#1a1a1a' }}>
              Collective Consciousness Upload
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload brain dumps, thoughts, insights, or any content to expand Millie's knowledge and shape her personality.
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={12}
              variant="outlined"
              placeholder="Paste or type content here... This can be anything: meeting notes, insights about crypto, community wisdom, strategic thoughts, etc."
              value={collectiveText}
              onChange={(e) => setCollectiveText(e.target.value)}
              sx={{ mb: 2 }}
            />
            
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleCollectiveUpload}
              disabled={!collectiveText.trim() || loading}
              startIcon={<PsychologyIcon />}
              sx={{
                background: '#1a1a1a',
                '&:hover': {
                  background: '#333',
                },
                fontWeight: 600,
                py: 1.5,
              }}
            >
              Add to Collective Consciousness
            </Button>
          </TabPanel>

          {/* Transcripts Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#1a1a1a' }}>
              Upload Meeting Transcript
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload weekly meeting transcripts to update community news and coin spotlights.
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={10}
              variant="outlined"
              placeholder="Paste meeting transcript here..."
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              sx={{ mb: 2 }}
            />
            
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleTranscriptUpload}
              disabled={!transcriptText.trim() || loading}
              sx={{
                background: '#1a1a1a',
                '&:hover': {
                  background: '#333',
                },
                fontWeight: 600,
                py: 1.5,
              }}
            >
              Process Transcript
            </Button>
          </TabPanel>

          {/* System Prompt Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#1a1a1a' }}>
              System Prompt Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Define Millie's core personality, tone, and behavior. This prompt guides how she responds to users.
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={12}
              variant="outlined"
              placeholder="Enter system prompt..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              sx={{ mb: 2 }}
            />
            
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleSystemPromptUpdate}
              disabled={!systemPrompt.trim() || loading}
              startIcon={<SettingsIcon />}
              sx={{
                background: '#1a1a1a',
                '&:hover': {
                  background: '#333',
                },
                fontWeight: 600,
                py: 1.5,
              }}
            >
              Update System Prompt
            </Button>
          </TabPanel>

          {/* Daily Wisdom Tab */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#1a1a1a' }}>
              Daily Wisdom Quotes
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Manage the inspirational quotes that appear in the user dashboard.
            </Typography>
            
            <Card sx={{ 
              mb: 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              border: '1px solid #e0e0e0',
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Enter a new inspirational quote..."
                    value={newQuote}
                    onChange={(e) => setNewQuote(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddQuote}
                    disabled={!newQuote.trim() || loading}
                    startIcon={<AddIcon />}
                    sx={{
                      background: '#1a1a1a',
                      '&:hover': {
                        background: '#333',
                      },
                      fontWeight: 600,
                      px: 3,
                    }}
                  >
                    Add
                  </Button>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              border: '1px solid #e0e0e0',
            }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Current Quotes ({dailyQuotes.length})
                </Typography>
                <List>
                  {dailyQuotes.map((quote, index) => (
                    <ListItem key={index} divider>
                      <ListItemText 
                        primary={quote}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          onClick={() => handleDeleteQuote(index)}
                          disabled={loading}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </TabPanel>

          {/* Whitelist Tab */}
          <TabPanel value={tabValue} index={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#1a1a1a' }}>
              Member Whitelist Management
            </Typography>
            
            <Card sx={{ 
              mb: 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              border: '1px solid #e0e0e0',
            }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Add Individual Email
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    type="email"
                    variant="outlined"
                    placeholder="member@email.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddEmail}
                    disabled={!newEmail.trim() || loading}
                    sx={{
                      background: '#1a1a1a',
                      '&:hover': {
                        background: '#333',
                      },
                      fontWeight: 600,
                      px: 3,
                    }}
                  >
                    Add
                  </Button>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ 
              mb: 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              border: '1px solid #e0e0e0',
            }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Bulk Upload
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Paste emails separated by commas, semicolons, or new lines
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  placeholder="email1@example.com, email2@example.com"
                  value={csvEmails}
                  onChange={(e) => setCsvEmails(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleCsvUpload}
                  disabled={!csvEmails.trim() || loading}
                  sx={{
                    background: '#1a1a1a',
                    '&:hover': {
                      background: '#333',
                    },
                    fontWeight: 600,
                    py: 1.5,
                  }}
                >
                  Upload Emails
                </Button>
              </CardContent>
            </Card>

            <Card sx={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              border: '1px solid #e0e0e0',
            }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Current Whitelist ({whitelist.length} members)
                </Typography>
                <Box sx={{ 
                  mt: 2, 
                  maxHeight: 300, 
                  overflow: 'auto',
                  p: 2,
                  bgcolor: '#f5f5f5',
                  borderRadius: 1,
                  border: '1px solid #e0e0e0',
                }}>
                  {whitelist.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      No emails in whitelist yet
                    </Typography>
                  ) : (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {whitelist.map((email, idx) => (
                        <Chip 
                          key={idx} 
                          label={email} 
                          size="small"
                          sx={{
                            bgcolor: '#1a1a1a',
                            color: '#fff',
                            fontWeight: 500,
                            '& .MuiChip-label': {
                              px: 1.5,
                            },
                          }}
                        />
                      ))}
                    </Stack>
                  )}
                </Box>
              </CardContent>
            </Card>
          </TabPanel>

          {loading && <LinearProgress />}
        </Paper>
      </Container>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ 
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}