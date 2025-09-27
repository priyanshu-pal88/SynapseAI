import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import '../components/AuthLayout.css'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const navigate = useNavigate()

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const response = await axios.get('/api/auth/verify', { withCredentials: true })
        
        if (response.data.success) {
          // User is already logged in, redirect to home
          navigate('/')
        }
      } catch (error) {
        // User is not authenticated, stay on login page
        console.log('User not authenticated')
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuthentication()
  }, [navigate])

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Checking authentication...</p>
      </div>
    )
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSubmit = async(e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email: formData.email,
        password: formData.password
      }, {
        withCredentials: true
      })
      
      // Login successful
      console.log('Login successful:', response.data)
      
      // Clear form and navigate to home
      setFormData({
        email: '',
        password: ''
      })
      navigate('/')
      
    } catch (error) {
      // Login failed
      console.error('Login failed:', error.response?.data || error.message)
      
      // Set error message
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.'
      setError(errorMessage)
      
      // Don't clear the form on error, keep user input
      // Don't navigate on error, stay on login page
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Welcome back</h2>
        
        {error && (
          <div className="error-message" style={{
            color: '#dc2626',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
          />
        </div>

        <button type="submit" className="auth-btn" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
        
        <div className="auth-link">
          Don't have an account? <Link to="/register">Sign up</Link>
        </div>
      </form>
    </div>
  )
}

export default Login