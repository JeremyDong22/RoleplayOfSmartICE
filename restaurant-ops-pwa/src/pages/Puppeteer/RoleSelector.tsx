// Role Selector Component
// Allows sample manager to select which role's tasks to manage

import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  Chip
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import PersonIcon from '@mui/icons-material/Person'
import type { Role, Restaurant } from '../../types/sampleManager.types'
import { SampleManagerService } from '../../services/sampleManagerService'

interface RoleSelectorProps {
  restaurant: Restaurant
  onSelect: (role: Role) => void
  onBack: () => void
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ restaurant, onSelect, onBack }) => {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    try {
      setLoading(true)
      const data = await SampleManagerService.getRoles()
      // Filter out CEO and Administrator roles for sample management
      const filteredRoles = data?.filter(role => 
        !['ceo', 'administrator'].includes(role.role_code)
      ) || []
      setRoles(filteredRoles)
    } catch (err) {
      setError('Failed to load roles')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getRoleColor = (roleCode: string) => {
    switch (roleCode) {
      case 'manager': return '#2196f3'
      case 'chef': return '#ff9800'
      case 'duty_manager': return '#9c27b0'
      default: return '#757575'
    }
  }

  const getRoleIcon = (department: string | null) => {
    return department === '后厨' ? '👨‍🍳' : '👔'
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={onBack} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" gutterBottom>
            选择角色
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <RestaurantIcon fontSize="small" color="action" />
            <Typography variant="body1" color="textSecondary">
              {restaurant.name}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {roles.map((role) => (
          <Grid item xs={12} sm={6} md={4} key={role.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                borderTop: `4px solid ${getRoleColor(role.role_code)}`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={() => onSelect(role)}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Typography variant="h4" mr={2}>
                    {getRoleIcon(role.department)}
                  </Typography>
                  <Box flex={1}>
                    <Typography variant="h6">
                      {role.role_name_zh}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {role.role_name_en}
                    </Typography>
                  </Box>
                </Box>
                
                {role.department && (
                  <Chip 
                    label={role.department} 
                    size="small" 
                    color={role.department === '后厨' ? 'warning' : 'primary'}
                    variant="outlined"
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {roles.length === 0 && (
        <Box mt={3}>
          <Alert severity="info">暂无可管理的角色</Alert>
        </Box>
      )}
    </Box>
  )
}