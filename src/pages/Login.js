import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Auth0 configuration for User Portal
  const config = {
    domain: "bms-optimus.us.auth0.com",
    webClientId: "sUx9EQz3ETirGypH8BUou5Thy0avgexk",
    webClientSecret: "vKuJcE30YeJzXKsSYObt0kZXJW5IyrLxxR15ZplazSZwOHn7ODRhBrK2_KKwJeOn",
    managementClientId: "x3UIh4PsAjdW1Y0uTmjDUk5VIA36iQ12",
    managementClientSecret: "xYfZ6lk_kJoLy73sgh3jAY_4U4bMnwm58EjN97Ozw-JcsQTs36JpA2UM4C2xVn-r",
    audience: "https://bms-optimus.us.auth0.com/api/v2/",
    allowedRoleId: "rol_FdjheKGmIFxzp6hR" // Only users with this role can login
  };

  // Get Management API token
  const getManagementToken = async () => {
    try {
      const response = await fetch(`https://${config.domain}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: config.managementClientId,
          client_secret: config.managementClientSecret,
          audience: config.audience,
          grant_type: "client_credentials",
          scope: "read:users read:roles read:role_members",
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get management token');
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error("Error getting management token:", error);
      return null;
    }
  };

  // Check if user has the allowed role
  const checkUserRole = async (userId) => {
    try {
      const token = await getManagementToken();
      
      if (!token) {
        return false;
      }

      // Fetch users with the allowed role
      const response = await fetch(
        `https://${config.domain}/api/v2/roles/${config.allowedRoleId}/users`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch role users");
        return false;
      }

      const roleUsers = await response.json();
      const hasRole = roleUsers.some(user => user.user_id === userId);
      
      console.log("User has allowed role:", hasRole);
      return hasRole;
    } catch (error) {
      console.error("Error checking user role:", error);
      return false;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Both email and password fields are required.");
      return;
    }

    setIsLoading(true);
    setError('');
  
    try {
      const tokenData = new URLSearchParams({
        grant_type: "http://auth0.com/oauth/grant-type/password-realm",
        username: email,
        password: password,
        audience: config.audience,
        client_id: config.webClientId,
        realm: "Username-Password-Authentication",
        scope: "openid profile email",
      });
  
      const response = await fetch(`https://${config.domain}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body: tokenData,
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error_description || "Login failed");
      }
  
      const userResponse = await fetch(`https://${config.domain}/userinfo`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });
  
      const userData = await userResponse.json();

      // Check if user has the allowed role
      const hasAllowedRole = await checkUserRole(userData.sub);
      
      if (!hasAllowedRole) {
        setError("You do not have access to this application. Please contact support.");
        return;
      }

      // Extract username from metadata or fallback to email
      const storedUsername = userData.user_metadata?.username || userData.email.split("@")[0];
  
      // Store user details in sessionStorage
      const userInfo = {
        username: storedUsername,
        email: userData.email,
      };
      
      sessionStorage.setItem("user", JSON.stringify(userInfo));
      sessionStorage.setItem("access_token", data.access_token);
      
      console.log("User info saved:", storedUsername, userData.email); 
  
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center mb-6">
            <img src="/logo.png" alt="Optimus Logo" className="w-8 h-8 mr-3" />
            <span className="text-2xl font-normal text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Optimus
            </span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-10">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Log in to your account
            </h2>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                {error}
              </p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm text-gray-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Email
              </label>
              <input
                type="text"
                placeholder="elon@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm text-gray-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-700 text-white py-3 px-4 rounded-lg text-sm font-medium hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Signup Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="text-blue-700 font-medium hover:text-blue-800"
              >
                SIGN UP HERE
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}