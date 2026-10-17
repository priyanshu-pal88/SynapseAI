import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import '../components/AuthLayout.css'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const navigate = useNavigate()

  // Check authentication in background without blocking switching between login/register
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/verify`, { withCredentials: true })
        if (response.data.success) {
          navigate('/')
        }
      } catch (error) {
        // User not authenticated, stay on login
      }
    }
    checkAuthentication()
  }, [navigate])

  // KEEP handleChange and handleSubmit EXACTLY AS-IS
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
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: formData.email,
        password: formData.password
      }, {
        withCredentials: true
      })
      console.log('Login successful:', response.data)
      setFormData({ email: '', password: '' })
      navigate('/')
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message)
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-logo-container">
          <div className="auth-logo-aura"></div>
          <div className="auth-logo-frame">
            <img 
              src="/SynapseAI.png" 
              alt="Synapse AI" 
              className="auth-logo"
            />
          </div>
        </div>
        <h2>Welcome back</h2>

        {error && (
          <div className="error-message">{error}</div>
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