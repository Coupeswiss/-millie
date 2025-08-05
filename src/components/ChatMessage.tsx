import { Box, Paper, Typography, Avatar } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

interface Props {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatMessage({ role, content }: Props) {
  const isUser = role === 'user';
  
  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 2,
      flexDirection: isUser ? 'row-reverse' : 'row',
    }}>
      <Avatar sx={{ 
        bgcolor: isUser ? 'secondary.main' : 'primary.main',
        width: 40,
        height: 40,
        fontWeight: 700,
      }}>
        {isUser ? <PersonIcon /> : 'M'}
      </Avatar>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          maxWidth: '70%',
          bgcolor: isUser ? 'rgba(247, 178, 103, 0.15)' : 'rgba(78, 205, 196, 0.1)',
          border: '1px solid',
          borderColor: isUser ? 'rgba(247, 178, 103, 0.3)' : 'rgba(78, 205, 196, 0.3)',
          borderRadius: 2,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '12px',
            [isUser ? 'right' : 'left']: '-8px',
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderWidth: isUser ? '8px 0 8px 8px' : '8px 8px 8px 0',
            borderColor: isUser 
              ? `transparent transparent transparent rgba(247, 178, 103, 0.15)`
              : `transparent rgba(78, 205, 196, 0.1) transparent transparent`,
          },
        }}
      >
        <Typography variant="body1" sx={{ 
          whiteSpace: 'pre-line',
          lineHeight: 1.6,
          color: 'text.primary',
        }}>
          {content}
        </Typography>
      </Paper>
    </Box>
  );
} 