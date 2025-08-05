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
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LogoutIcon from '@mui/icons-material/Logout';
import DescriptionIcon from '@mui/icons-material/Description';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FileUploadIcon from '@mui/icons-material/FileUpload';
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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
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
  const [transcriptText, setTranscriptText] = useState('');
  const [contextText, setContextText] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [newEmail, setNewEmail] = useState('');
  const [csvEmails, setCsvEmails] = useState('');
  const [whitelist, setWhitelist] = useState<string[]>([]);

  const handleTranscriptUpload = async () => {
    if (!transcriptText.trim()) return;
    
    setLoading(true);
    try {
      await api.post('/api/transcripts', { text: transcriptText });
      setSnackbar({ open: true, message: 'Transcript uploaded successfully! User dashboards will refresh within 60 seconds.', severity: 'success' });
      setTranscriptText('');
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to upload transcript', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleContextUpload = async () => {
    if (!contextText.trim()) return;
    
    setLoading(true);
    try {
      // For now, this adds to the same knowledge base
      await api.post('/api/transcripts', { text: contextText, date: new Date().toISOString() });
      setSnackbar({ open: true, message: 'Context added to Millie\'s knowledge base!', severity: 'success' });
      setContextText('');
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to add context', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

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
      // Parse CSV (handles comma, newline, or semicolon separated)
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

  useEffect(() => {
    if (tabValue === 2) {
      fetchWhitelist();
    }
  }, [tabValue]);

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0033 0%, #330066 100%)',
    }}>
      {/* Admin Header */}
      <Paper sx={{ 
        borderRadius: 0,
        background: 'rgba(138, 43, 226, 0.1)',
        backdropFilter: 'blur(10px)',
        borderBottom: '2px solid rgba(138, 43, 226, 0.3)',
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            py: 2,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AdminPanelSettingsIcon sx={{ fontSize: 32, color: '#8A2BE2' }} />
              <Typography variant="h5" sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(90deg, #8A2BE2 0%, #9370DB 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Queen of Millions Admin Portal
              </Typography>
            </Box>
            <IconButton onClick={onLogout} sx={{ color: 'text.secondary' }}>
              <LogoutIcon />
            </IconButton>
          </Box>
        </Container>
      </Paper>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper sx={{ 
          background: 'rgba(30, 0, 60, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(138, 43, 226, 0.3)',
        }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: '#8A2BE2',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#8A2BE2',
              },
            }}
          >
            <Tab label="Upload Transcript" icon={<UploadFileIcon />} iconPosition="start" />
            <Tab label="Add Context" icon={<DescriptionIcon />} iconPosition="start" />
            <Tab label="Member Whitelist" icon={<GroupsIcon />} iconPosition="start" />
            <Tab label="System Status" icon={<AutoAwesomeIcon />} iconPosition="start" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Box>
              <Typography variant="h6" gutterBottom sx={{ color: '#8A2BE2', mb: 3 }}>
                Upload Weekly Meeting Transcript
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                This will process the transcript, update the dashboard with new quotes, news, and coin spotlight,
                and add the content to Millie's knowledge base.
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={12}
                variant="outlined"
                placeholder="Paste the full transcript here..."
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(138, 43, 226, 0.05)',
                    '& fieldset': {
                      borderColor: 'rgba(138, 43, 226, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(138, 43, 226, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#8A2BE2',
                    },
                  },
                }}
              />
              
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleTranscriptUpload}
                disabled={!transcriptText.trim() || loading}
                sx={{
                  mt: 3,
                  py: 1.5,
                  background: 'linear-gradient(90deg, #8A2BE2 0%, #9370DB 100%)',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #7B1FA2 0%, #8E24AA 100%)',
                  },
                  '&:disabled': {
                    background: 'rgba(138, 43, 226, 0.3)',
                  },
                }}
              >
                {loading ? 'Processing...' : 'Upload & Process Transcript'}
              </Button>
              
              {loading && <LinearProgress sx={{ mt: 2 }} />}
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box>
              <Typography variant="h6" gutterBottom sx={{ color: '#8A2BE2', mb: 3 }}>
                Add Context to Millie's Knowledge Base
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Add specific information, FAQs, or educational content that Millie can reference when answering questions.
                This won't update the dashboard but will enhance Millie's responses.
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={12}
                variant="outlined"
                placeholder="Enter educational content, FAQs, or specific information..."
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(138, 43, 226, 0.05)',
                    '& fieldset': {
                      borderColor: 'rgba(138, 43, 226, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(138, 43, 226, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#8A2BE2',
                    },
                  },
                }}
              />
              
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleContextUpload}
                disabled={!contextText.trim() || loading}
                sx={{
                  mt: 3,
                  py: 1.5,
                  background: 'linear-gradient(90deg, #8A2BE2 0%, #9370DB 100%)',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #7B1FA2 0%, #8E24AA 100%)',
                  },
                  '&:disabled': {
                    background: 'rgba(138, 43, 226, 0.3)',
                  },
                }}
              >
                {loading ? 'Adding to Knowledge Base...' : 'Add Context'}
              </Button>
              
              {loading && <LinearProgress sx={{ mt: 2 }} />}
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box>
              <Typography variant="h6" gutterBottom sx={{ color: '#8A2BE2', mb: 3 }}>
                Member Whitelist Management
              </Typography>
              
              {/* Add Individual Email */}
              <Paper sx={{ 
                p: 3, 
                mb: 3,
                background: 'rgba(138, 43, 226, 0.05)',
                border: '1px solid rgba(138, 43, 226, 0.2)',
              }}>
                <Typography variant="subtitle1" gutterBottom sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  mb: 2,
                }}>
                  <PersonAddIcon sx={{ color: '#8A2BE2' }} />
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(138, 43, 226, 0.05)',
                        '& fieldset': {
                          borderColor: 'rgba(138, 43, 226, 0.3)',
                        },
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddEmail}
                    disabled={!newEmail.trim() || loading}
                    sx={{
                      px: 3,
                      background: 'linear-gradient(90deg, #8A2BE2 0%, #9370DB 100%)',
                      '&:hover': {
                        background: 'linear-gradient(90deg, #7B1FA2 0%, #8E24AA 100%)',
                      },
                    }}
                  >
                    Add
                  </Button>
                </Box>
              </Paper>
              
              {/* Bulk Upload */}
              <Paper sx={{ 
                p: 3, 
                mb: 3,
                background: 'rgba(138, 43, 226, 0.05)',
                border: '1px solid rgba(138, 43, 226, 0.2)',
              }}>
                <Typography variant="subtitle1" gutterBottom sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  mb: 2,
                }}>
                  <FileUploadIcon sx={{ color: '#8A2BE2' }} />
                  Bulk Email Upload
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Paste emails separated by commas, semicolons, or new lines
                </Typography>
                
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  variant="outlined"
                  placeholder="email1@example.com, email2@example.com&#10;email3@example.com"
                  value={csvEmails}
                  onChange={(e) => setCsvEmails(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(138, 43, 226, 0.05)',
                      '& fieldset': {
                        borderColor: 'rgba(138, 43, 226, 0.3)',
                      },
                    },
                  }}
                />
                
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleCsvUpload}
                  disabled={!csvEmails.trim() || loading}
                  sx={{
                    mt: 2,
                    py: 1.5,
                    background: 'linear-gradient(90deg, #8A2BE2 0%, #9370DB 100%)',
                    '&:hover': {
                      background: 'linear-gradient(90deg, #7B1FA2 0%, #8E24AA 100%)',
                    },
                  }}
                >
                  Upload Emails
                </Button>
              </Paper>
              
              {/* Current Whitelist */}
              <Paper sx={{ 
                p: 3,
                background: 'rgba(138, 43, 226, 0.05)',
                border: '1px solid rgba(138, 43, 226, 0.2)',
              }}>
                <Typography variant="subtitle1" gutterBottom>
                  Current Whitelist ({whitelist.length} members)
                </Typography>
                <Box sx={{ 
                  mt: 2, 
                  maxHeight: 300, 
                  overflow: 'auto',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: 1,
                  p: 2,
                }}>
                  {whitelist.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No emails in whitelist yet
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {whitelist.map((email, idx) => (
                        <Chip
                          key={idx}
                          label={email}
                          size="small"
                          sx={{
                            background: 'rgba(138, 43, 226, 0.2)',
                            borderColor: 'rgba(138, 43, 226, 0.4)',
                          }}
                        />
                      ))}
                    </Stack>
                  )}
                </Box>
              </Paper>
              
              {loading && <LinearProgress sx={{ mt: 2 }} />}
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Box>
              <Typography variant="h6" gutterBottom sx={{ color: '#8A2BE2', mb: 3 }}>
                System Status
              </Typography>
              
              <Stack spacing={3}>
                <Alert severity="success" sx={{ 
                  background: 'rgba(76, 175, 80, 0.1)',
                  '& .MuiAlert-icon': { color: '#4CAF50' },
                }}>
                  Millie is online and responding to queries
                </Alert>
                
                <Paper sx={{ 
                  p: 3, 
                  background: 'rgba(138, 43, 226, 0.05)',
                  border: '1px solid rgba(138, 43, 226, 0.2)',
                }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Knowledge Base Stats
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Chip label="Vector Embeddings: Active" color="success" />
                    <Chip label="Web Search: Enabled" color="success" />
                    <Chip label="PulseChain Focus: Active" color="primary" />
                  </Stack>
                </Paper>
                
                <Paper sx={{ 
                  p: 3, 
                  background: 'rgba(138, 43, 226, 0.05)',
                  border: '1px solid rgba(138, 43, 226, 0.2)',
                }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Recent Activity
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    • Dashboard auto-refresh: Every 5 minutes<br />
                    • Last transcript uploaded: Check server logs<br />
                    • Active integrations: DuckDuckGo, CoinGecko
                  </Typography>
                </Paper>
              </Stack>
            </Box>
          </TabPanel>
        </Paper>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}