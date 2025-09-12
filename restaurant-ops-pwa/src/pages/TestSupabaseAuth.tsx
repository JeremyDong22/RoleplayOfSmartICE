/**
 * Test page for Supabase Auth migration
 * Tests both legacy and Supabase authentication
 * 
 * Created: 2025-01-12 - Testing dual authentication system
 */
import { useState } from 'react'
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Chip
} from '@mui/material'
import { authHybridService } from '../services/authHybridService'
import { authService } from '../services/authService'
import { authSupabaseService } from '../services/authSupabaseService'

export const TestSupabaseAuth = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [useSupabase, setUseSupabase] = useState(authHybridService.isSupabaseAuthEnabled())
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [migrationStats, setMigrationStats] = useState<any>(null)
  
  // Toggle Supabase Auth
  const handleToggleSupabase = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked
    setUseSupabase(enabled)
    authHybridService.setUseSupabaseAuth(enabled)
    setResult(null)
    setError('')
  }
  
  // Test login
  const handleLogin = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    
    try {
      console.log('Testing login with:', { username, useSupabase })
      
      const loginResult = await authHybridService.login(username, password)
      
      if (loginResult.error) {
        setError(loginResult.error)
      } else {
        // Get current user info
        const currentUser = await authHybridService.getCurrentUser()
        const isSupabaseAuth = await authSupabaseService.isAuthenticated()
        const isLegacyAuth = authService.isAuthenticated()
        
        setResult({
          success: true,
          user: loginResult.user,
          currentUser,
          authType: isSupabaseAuth ? 'Supabase Auth' : 'Legacy Cookie Auth',
          isSupabaseAuth,
          isLegacyAuth
        })
      }
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }
  
  // Test logout
  const handleLogout = async () => {
    setLoading(true)
    try {
      await authHybridService.logout()
      setResult(null)
      setError('Logged out successfully')
    } catch (err: any) {
      setError(err.message || 'Logout failed')
    } finally {
      setLoading(false)
    }
  }
  
  // Get migration stats
  const handleGetStats = async () => {
    setLoading(true)
    try {
      const stats = await authHybridService.getMigrationStatus()
      setMigrationStats(stats)
    } catch (err: any) {
      setError(err.message || 'Failed to get stats')
    } finally {
      setLoading(false)
    }
  }
  
  // Check current auth status
  const handleCheckAuth = async () => {
    setLoading(true)
    try {
      const isAuthenticated = await authHybridService.isAuthenticated()
      const currentUser = await authHybridService.getCurrentUser()
      const isSupabaseAuth = await authSupabaseService.isAuthenticated()
      const isLegacyAuth = authService.isAuthenticated()
      
      setResult({
        isAuthenticated,
        currentUser,
        isSupabaseAuth,
        isLegacyAuth,
        authType: isSupabaseAuth ? 'Supabase Auth' : isLegacyAuth ? 'Legacy Cookie Auth' : 'Not authenticated'
      })
    } catch (err: any) {
      setError(err.message || 'Check failed')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Supabase Auth Migration Test
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Configuration
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={useSupabase}
                onChange={handleToggleSupabase}
                color="primary"
              />
            }
            label={
              <Box>
                Use Supabase Auth
                <Typography variant="caption" display="block" color="text.secondary">
                  {useSupabase 
                    ? 'Enabled - Will attempt Supabase Auth first, then fallback to legacy'
                    : 'Disabled - Using legacy cookie-based auth only'}
                </Typography>
              </Box>
            }
          />
        </Paper>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Test Login
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              placeholder="e.g., manager1"
            />
            
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              placeholder="e.g., manager1123"
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleLogin}
                disabled={loading || !username || !password}
              >
                Test Login
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleCheckAuth}
                disabled={loading}
              >
                Check Auth Status
              </Button>
              
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleLogout}
                disabled={loading}
              >
                Logout
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleGetStats}
                disabled={loading}
              >
                Migration Stats
              </Button>
            </Box>
          </Box>
        </Paper>
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {result && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Result
            </Typography>
            
            <List>
              {result.success && (
                <ListItem>
                  <ListItemText
                    primary="Login Successful"
                    secondary={
                      <Chip 
                        label={result.authType} 
                        color={result.isSupabaseAuth ? 'success' : 'warning'}
                        size="small"
                      />
                    }
                  />
                </ListItem>
              )}
              
              {result.isAuthenticated !== undefined && (
                <ListItem>
                  <ListItemText
                    primary="Authentication Status"
                    secondary={result.isAuthenticated ? 'Authenticated' : 'Not authenticated'}
                  />
                </ListItem>
              )}
              
              {result.authType && (
                <ListItem>
                  <ListItemText
                    primary="Auth Type"
                    secondary={result.authType}
                  />
                </ListItem>
              )}
              
              {result.currentUser && (
                <>
                  <ListItem>
                    <ListItemText
                      primary="User ID"
                      secondary={result.currentUser.id}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Email"
                      secondary={result.currentUser.email}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Name"
                      secondary={result.currentUser.name}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Role"
                      secondary={`${result.currentUser.role} (${result.currentUser.roleCode})`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Restaurant ID"
                      secondary={result.currentUser.restaurantId}
                    />
                  </ListItem>
                </>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <ListItem>
                <ListItemText
                  primary="Auth States"
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        Supabase Auth: {result.isSupabaseAuth ? '✅ Active' : '❌ Inactive'}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Legacy Auth: {result.isLegacyAuth ? '✅ Active' : '❌ Inactive'}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            </List>
          </Paper>
        )}
        
        {migrationStats && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Migration Statistics
            </Typography>
            
            <List>
              <ListItem>
                <ListItemText
                  primary="Total Users"
                  secondary={migrationStats.totalUsers}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Migrated Users"
                  secondary={`${migrationStats.migratedUsers} (${migrationStats.migrationPercentage.toFixed(1)}%)`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Pending Users"
                  secondary={migrationStats.pendingUsers}
                />
              </ListItem>
            </List>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Progress: {migrationStats.migratedUsers}/{migrationStats.totalUsers}
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  height: 20,
                  bgcolor: 'grey.300',
                  borderRadius: 1,
                  overflow: 'hidden',
                  mt: 1
                }}
              >
                <Box
                  sx={{
                    width: `${migrationStats.migrationPercentage}%`,
                    height: '100%',
                    bgcolor: 'primary.main',
                    transition: 'width 0.3s'
                  }}
                />
              </Box>
            </Box>
          </Paper>
        )}
      </Box>
    </Container>
  )
}