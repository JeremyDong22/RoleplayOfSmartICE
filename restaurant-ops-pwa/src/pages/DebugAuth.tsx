// Debug page to check current auth status
import React from 'react';
import { Box, Container, Typography, Paper, Button } from '@mui/material';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';

export const DebugAuth: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const allCookies = Cookies.get();

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Auth Debug Information
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Current User from authService:
          </Typography>
          {currentUser ? (
            <pre>{JSON.stringify(currentUser, null, 2)}</pre>
          ) : (
            <Typography color="error">No user logged in</Typography>
          )}
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            All Cookies:
          </Typography>
          <pre>{JSON.stringify(allCookies, null, 2)}</pre>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Role Check:
          </Typography>
          <Typography>
            roleCode from user: {currentUser?.roleCode || 'undefined'}
          </Typography>
          <Typography>
            Is CEO? {currentUser?.roleCode === 'ceo' ? 'YES ✅' : 'NO ❌'}
          </Typography>
          <Typography>
            CEO card should be: {currentUser?.roleCode === 'ceo' ? 'ENABLED' : 'DISABLED'}
          </Typography>
        </Paper>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" onClick={() => navigate('/role-selection')}>
            Go to Role Selection
          </Button>
          <Button variant="contained" color="secondary" onClick={() => navigate('/ceo')}>
            Try Direct CEO Access
          </Button>
          <Button variant="outlined" onClick={() => {
            // Manually fix the roleCode if needed
            if (currentUser && currentUser.role === '总经理') {
              Cookies.set('userRoleCode', 'ceo', { expires: 7 });
              window.location.reload();
            }
          }}>
            Fix CEO Role
          </Button>
        </Box>
      </Box>
    </Container>
  );
};