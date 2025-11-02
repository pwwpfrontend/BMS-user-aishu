import React, { useState } from 'react';

export default function Plans() {
  // State to track user's subscription
  // Options: 'innobuddies', 'innopeers', null (no subscription)
  const [subscription, setSubscription] = useState('innobuddies'); // Change this to test different states
  
  // State for success message
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Handle "I'm Interested" button click
  const handleInterested = () => {
    setShowSuccessMessage(true);
    
    // Hide message after 5 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 5000);
  };

  // Plan data
  const plans = {
    innobuddies: {
      name: 'InnoBuddies',
      price: 'HK$0.00',
      period: 'every 24 months',
      status: 'Current Plan',
      description: 'Enjoy FREE Membership!',
      buttonText: 'Subscribed',
      buttonDisabled: true,
      buttonStyle: 'bg-gray-400 text-white cursor-not-allowed'
    },
    innopeers: {
      name: 'InnoPeers',
      price: 'HK$0.00',
      period: 'every 24 months',
      status: 'Current Plan',
      description: 'Endorsement Required*',
      note: 'Please fill in InnoPeers Registration Form that appears on subscription.',
      buttonText: 'Subscribed',
      buttonDisabled: true,
      buttonStyle: 'bg-gray-400 text-white cursor-not-allowed'
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <h2 className="text-3xl font-semibold text-gray-900 mb-8" style={{ fontFamily: 'Inter' }}>
          All Plans
        </h2>

        {/* Success Message Toast */}
        {showSuccessMessage && (
          <div className="fixed top-20 right-8 bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 z-50 animate-slide-in">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-green-900 mb-1" style={{ fontFamily: 'Inter' }}>
                  Thank you for your interest!
                </h3>
                <p className="text-sm text-green-700" style={{ fontFamily: 'Inter' }}>
                  We have noted your interest in InnoPeers+ Plan. Our team will reach out to you shortly with more information.
                </p>
              </div>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="text-green-600 hover:text-green-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Plans Grid - InnoBuddies Subscribed */}
        {subscription === 'innobuddies' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* InnoBuddies Card */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 relative">
              {/* Current Plan Badge */}
              <div className="absolute -top-3 left-6">
                <span className="px-4 py-1 bg-white border border-blue-600 text-blue-600 text-xs font-medium rounded-full" style={{ fontFamily: 'Inter' }}>
                  Current Plan
                </span>
              </div>

              {/* Plan Name */}
              <h2 className="text-xl font-bold text-gray-900 mt-4 mb-2" style={{ fontFamily: 'Inter' }}>
                InnoBuddies
              </h2>

              {/* Price */}
              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Inter' }}>
                  HK$0.00
                </div>
                <div className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>
                  every 24 months
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <p className="text-sm font-medium text-blue-600" style={{ fontFamily: 'Inter' }}>
                  Enjoy FREE Membership!
                </p>
              </div>

              {/* Subscribe Button */}
              <button
                disabled
                className="w-full py-3 mt-6 bg-gray-400 text-white font-medium rounded-lg cursor-not-allowed"
                style={{ fontFamily: 'Inter' }}
              >
                Subscribed
              </button>
            </div>

            {/* InnoPeers Card */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
              {/* Plan Name */}
              <h2 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>
                InnoPeers
              </h2>

              {/* Price */}
              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Inter' }}>
                  HK$0.00
                </div>
                <div className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>
                  every 24 months
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-blue-600 mb-2" style={{ fontFamily: 'Inter' }}>
                  Endorsement Required*
                </p>
                <p className="text-xs text-blue-600" style={{ fontFamily: 'Inter' }}>
                  Please fill in InnoPeers Registration Form that appears on subscription.
                </p>
              </div>

              {/* Subscribe Button */}
              <button
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                style={{ fontFamily: 'Inter' }}
              >
                Subscribe
              </button>
            </div>
          </div>
        )}

        {/* Plans Grid - InnoPeers Subscribed */}
        {subscription === 'innopeers' && (
          <>
            {/* InnoPeers Card - Current Plan */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 relative max-w-md mb-6">
              {/* Current Plan Badge */}
              <div className="absolute -top-3 left-6">
                <span className="px-4 py-1 bg-white border border-blue-600 text-blue-600 text-xs font-medium rounded-full" style={{ fontFamily: 'Inter' }}>
                  Current Plan
                </span>
              </div>

              {/* Plan Name */}
              <h2 className="text-xl font-bold text-gray-900 mt-4 mb-2" style={{ fontFamily: 'Inter' }}>
                InnoPeers
              </h2>

              {/* Price */}
              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Inter' }}>
                  HK$0.00
                </div>
                <div className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>
                  every 24 months
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-blue-600 mb-2" style={{ fontFamily: 'Inter' }}>
                  Endorsement Required*
                </p>
                <p className="text-xs text-blue-600" style={{ fontFamily: 'Inter' }}>
                  Please fill in InnoPeers Registration Form that appears on subscription.
                </p>
              </div>

              {/* Subscribe Button */}
              <button
                disabled
                className="w-full py-3 bg-gray-400 text-white font-medium rounded-lg cursor-not-allowed"
                style={{ fontFamily: 'Inter' }}
              >
                Subscribed
              </button>
            </div>

            {/* InnoPeers+ Interest Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-blue-900 font-semibold mb-1" style={{ fontFamily: 'Inter' }}>
                    InnoPeers+ Plan is available!
                  </p>
                  <p className="text-blue-700 text-sm" style={{ fontFamily: 'Inter' }}>
                    For more information{' '}
                    <a href="#" className="underline hover:text-blue-800">
                      click here
                    </a>
                  </p>
                </div>
                <button
                  onClick={handleInterested}
                  className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  style={{ fontFamily: 'Inter' }}
                >
                  I'm Interested
                </button>
              </div>
            </div>
          </>
        )}

        {/* No Subscription State */}
        {subscription === null && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* InnoBuddies Card */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
              {/* Plan Name */}
              <h2 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>
                InnoBuddies
              </h2>

              {/* Price */}
              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Inter' }}>
                  HK$0.00
                </div>
                <div className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>
                  every 24 months
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <p className="text-sm font-medium text-blue-600" style={{ fontFamily: 'Inter' }}>
                  Enjoy FREE Membership!
                </p>
              </div>

              {/* Subscribe Button */}
              <button
                onClick={() => setSubscription('innobuddies')}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                style={{ fontFamily: 'Inter' }}
              >
                Subscribe
              </button>
            </div>

            {/* InnoPeers Card */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
              {/* Plan Name */}
              <h2 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>
                InnoPeers
              </h2>

              {/* Price */}
              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Inter' }}>
                  HK$0.00
                </div>
                <div className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>
                  every 24 months
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-blue-600 mb-2" style={{ fontFamily: 'Inter' }}>
                  Endorsement Required*
                </p>
                <p className="text-xs text-blue-600" style={{ fontFamily: 'Inter' }}>
                  Please fill in InnoPeers Registration Form that appears on subscription.
                </p>
              </div>

              {/* Subscribe Button */}
              <button
                onClick={() => setSubscription('innopeers')}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                style={{ fontFamily: 'Inter' }}
              >
                Subscribe
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}