// Simplified App to test step by step
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { store } from './store'

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
})

function SimpleLogin() {
  return <div>Login Page</div>
}

function SimpleApp() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/login" element={<SimpleLogin />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </Provider>
  )
}

export default SimpleApp