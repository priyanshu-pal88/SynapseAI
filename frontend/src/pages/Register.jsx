import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../components/AuthLayout.css'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

const Register = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/verify`, { withCredentials: true })
        
        if (response.data.success) {
          // User is already logged in, redirect to home
          navigate('/')
        }
      } catch (error) {
        // User is not authenticated, stay on register page
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
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async(e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        fullName: {
          firstName: formData.firstName,
          lastName: formData.lastName,
        },
        email: formData.email,
        password: formData.password
      }, {
        withCredentials: true
      })
      
      // Registration successful
      console.log('Registration successful:', response.data)
      
      // Clear form and navigate to login
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: ''
      })
      
      // Navigate to login with success message
      navigate('/login', { 
        state: { message: 'Account created successfully! Please login.' }
      })
      
    } catch (error) {
      // Registration failed
      console.error('Registration failed:', error.response?.data || error.message)
      
      // Set error message
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.'
      setError(errorMessage)
      
      // Don't clear the form on error, keep user input
      // Don't navigate on error, stay on register page
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Create your account</h2>
        
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
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="Enter your first name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Enter your last name"
            required
          />
        </div>

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
            placeholder="Create a password"
            required
          />
        </div>

        <button type="submit" className="auth-btn" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
        
        <div className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </form>
    </div>
  )
}

export default Register