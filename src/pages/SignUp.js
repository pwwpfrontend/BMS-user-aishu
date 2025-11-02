import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const [username, setUsername] = useState('');
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
    // M2M Management API credentials (separate from web client)
    managementClientId: "x3UIh4PsAjdW1Y0uTmjDUk5VIA36iQ12",
    managementClientSecret: "xYfZ6lk_kJoLy73sgh3jAY_4U4bMnwm58EjN97Ozw-JcsQTs36JpA2UM4C2xVn-r",
    audience: "https://bms-optimus.us.auth0.com/api/v2/",
    userRoleId: "rol_FdjheKGmIFxzp6hR" // Role to assign to new users
  };

  // Get Management API access token (M2M)
  const getAccessToken = async () => {
    try {
      const response = await fetch(`https://${config.domain}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: config.managementClientId,
          client_secret: config.managementClientSecret,
          audience: config.audience,
          grant_type: "client_credentials",
          scope: "read:users read:users_app_metadata update:users_app_metadata read:user_idp_tokens read:client_grants create:users update:users delete:users read:clients read:client_credentials create:client_credentials read:roles update:roles create:roles"
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Management token error:", errorData);
        throw new Error('Failed to get management token');
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error("Error getting management token:", error);
      throw error;
    }
  };

  // Assign role to user
  const assignRoleToUser = async (userId, token) => {
    try {
      const response = await fetch(
        `https://${config.domain}/api/v2/roles/${config.userRoleId}/users`,
        {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            users: [userId]
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to assign role:", errorData);
        return false;
      }

      console.log("Role assigned successfully to user:", userId);
      return true;
    } catch (error) {
      console.error("Error assigning role:", error);
      return false;
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (!username || !email || !password) {
      setError("All fields are required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    // Password validation
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUppercase) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }
    if (!hasNumber) {
      setError("Password must contain at least one number.");
      return;
    }
    if (!hasSpecialChar) {
      setError("Password must contain at least one special character.");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Step 1: Get Management API token
      const token = await getAccessToken();

      // Step 2: Create user via Management API
      const createUserResponse = await fetch(
        `${config.audience}users`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
            password: password,
            connection: "Username-Password-Authentication",
            user_metadata: {
              username: username
            },
            email_verified: false,
            verify_email: false
          }),
        }
      );

      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json();
        throw new Error(errorData.message || "Failed to create account");
      }

      const userData = await createUserResponse.json();
      console.log("User created successfully:", userData.user_id);

      // Step 3: Assign role to the new user
      const roleAssigned = await assignRoleToUser(userData.user_id, token);
      
      if (!roleAssigned) {
        console.warn("User created but role assignment failed");
      }

      // Step 4: Automatically log in the user
      const loginData = new URLSearchParams({
        grant_type: "http://auth0.com/oauth/grant-type/password-realm",
        username: email,
        password: password,
        audience: config.audience,
        client_id: config.webClientId,
        realm: "Username-Password-Authentication",
        scope: "openid profile email",
      });

      const loginResponse = await fetch(`https://${config.domain}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body: loginData,
      });

      const loginTokens = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(loginTokens.error_description || "Login after signup failed");
      }

      // Step 5: Get user info
      const userInfoResponse = await fetch(`https://${config.domain}/userinfo`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${loginTokens.access_token}`,
        },
      });

      const userInfo = await userInfoResponse.json();

      // Step 6: Store user details
      const storedUsername = userInfo.user_metadata?.username || username;
      
      sessionStorage.setItem("user", JSON.stringify({
        username: storedUsername,
        email: userInfo.email,
      }));
      sessionStorage.setItem("access_token", loginTokens.access_token);

      console.log("Signup and login successful");
      
      // Navigate to dashboard
      navigate("/dashboard");
    } catch (error) {
      console.error("Signup error:", error);
      setError(error.message || "Failed to create account. Please try again.");
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

        {/* Signup Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-10">
          {/* Header */}
          <div className="mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              LET'S GET YOU STARTED
            </p>
            <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Create an Account
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

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-5">
            {/* Username Field */}
            <div>
              <label className="block text-sm text-gray-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Username
              </label>
              <input
                type="text"
                placeholder="Elon"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                required
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm text-gray-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Email
              </label>
              <input
                type="email"
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
              <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Must be 8+ characters with uppercase, number, and special character
              </p>
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-700 text-white py-3 px-4 rounded-lg text-sm font-medium hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-blue-700 font-medium hover:text-blue-800"
              >
                LOGIN HERE
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}